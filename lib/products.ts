import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { MAX_STOCK } from "@/lib/stock";

export type Product = {
  id: number;
  title: string;
  description: string;
  image: string;
  price: number;
  promoPrice: number | null;
  category: string;
  featured: boolean;
  active: boolean;
  /** Unidades disponíveis. null = estoque ilimitado (sem controle). */
  stock: number | null;
  createdAt: string;
};

const onVercel = Boolean(process.env.VERCEL);
const catalogPath = "catalog/products.json";
const cloudStorageReady = Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);

async function readCloudProducts(): Promise<Product[]> {
  if (!cloudStorageReady) return [];
  const result = await get(catalogPath, { access: "private", useCache: false });
  if (!result?.stream) return [];
  const products: unknown = await new Response(result.stream).json();
  if (!Array.isArray(products)) throw new Error("Catálogo armazenado inválido.");
  return (products as Product[]).map((product) => ({ ...product, stock: product.stock ?? null }));
}

async function writeCloudProducts(products: Product[]) {
  if (!cloudStorageReady) throw new Error("Armazenamento do catálogo não configurado.");
  await put(catalogPath, JSON.stringify(products), {
    access: "private", allowOverwrite: true, contentType: "application/json"
  });
}

let database: DatabaseSync | undefined;

function db() {
  if (!database) {
    const dir = path.join(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    database = new DatabaseSync(path.join(dir, "products.sqlite"));
    database.exec(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL,
      promoPrice INTEGER,
      category TEXT NOT NULL DEFAULT 'Doces',
      featured INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      stock INTEGER,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    // Bancos criados antes do controle de estoque não têm a coluna.
    const columns = database.prepare("PRAGMA table_info(products)").all() as { name: string }[];
    if (!columns.some((column) => column.name === "stock")) database.exec("ALTER TABLE products ADD COLUMN stock INTEGER");
  }
  return database;
}

function normalize(row: Record<string, unknown>): Product {
  return { ...row, featured: Boolean(row.featured), active: Boolean(row.active), stock: row.stock == null ? null : Number(row.stock) } as Product;
}

export async function listProducts(includeInactive = false): Promise<Product[]> {
  if (onVercel) {
    const products = await readCloudProducts();
    return products.filter((p) => includeInactive || p.active).sort((a, b) => Number(b.featured) - Number(a.featured) || b.id - a.id);
  }
  const rows = db().prepare(`SELECT * FROM products ${includeInactive ? "" : "WHERE active = 1"} ORDER BY featured DESC, id DESC`).all();
  return rows.map((row) => normalize(row as Record<string, unknown>));
}

export async function homeProductCount(excludeId?: number): Promise<number> {
  return (await listProducts(true)).filter((p) => p.featured && p.active && p.id !== excludeId).length;
}

export async function getProduct(id: number): Promise<Product | null> {
  if (onVercel) return (await readCloudProducts()).find((p) => p.id === id) ?? null;
  const row = db().prepare("SELECT * FROM products WHERE id = ?").get(id);
  return row ? normalize(row as Record<string, unknown>) : null;
}

export type ProductInput = Omit<Product, "id" | "createdAt">;

export async function saveProduct(input: ProductInput, id?: number): Promise<Product> {
  if (onVercel) {
    const products = await readCloudProducts();
    const existing = id ? products.find((p) => p.id === id) : null;
    const product: Product = { ...input, id: id ?? Math.max(0, ...products.map((p) => p.id)) + 1, createdAt: existing?.createdAt ?? new Date().toISOString() };
    await writeCloudProducts(existing ? products.map((p) => p.id === id ? product : p) : [...products, product]);
    return product;
  }
  if (id) {
    db().prepare(`UPDATE products SET title=?, description=?, image=?, price=?, promoPrice=?, category=?, featured=?, active=?, stock=? WHERE id=?`).run(
      input.title, input.description, input.image, input.price, input.promoPrice, input.category, Number(input.featured), Number(input.active), input.stock, id
    );
    return (await getProduct(id))!;
  }
  const result = db().prepare(`INSERT INTO products (title, description, image, price, promoPrice, category, featured, active, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    input.title, input.description, input.image, input.price, input.promoPrice, input.category, Number(input.featured), Number(input.active), input.stock
  );
  return (await getProduct(Number(result.lastInsertRowid)))!;
}

/** Lê o estoque vindo do formulário: vazio = ilimitado (null), número inteiro de 0 a 99999. undefined = valor inválido. */
export function parseStock(value: unknown): number | null | undefined {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return null;
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  const stock = Number(value);
  return Number.isInteger(stock) && stock >= 0 && stock <= MAX_STOCK ? stock : undefined;
}

export async function setStock(id: number, stock: number | null): Promise<Product | null> {
  if (onVercel) {
    const products = await readCloudProducts();
    const current = products.find((p) => p.id === id);
    if (!current) return null;
    const updated = { ...current, stock };
    await writeCloudProducts(products.map((p) => p.id === id ? updated : p));
    return updated;
  }
  db().prepare("UPDATE products SET stock = ? WHERE id = ?").run(stock, id);
  return getProduct(id);
}

/** Soma ou subtrai unidades sem passar de 0 nem de MAX_STOCK. Só vale para produtos com estoque controlado. */
export async function adjustStock(id: number, delta: number): Promise<Product | null> {
  if (onVercel) {
    const products = await readCloudProducts();
    const current = products.find((p) => p.id === id);
    if (!current || current.stock === null) return current ?? null;
    const updated = { ...current, stock: Math.min(MAX_STOCK, Math.max(0, current.stock + delta)) };
    await writeCloudProducts(products.map((p) => p.id === id ? updated : p));
    return updated;
  }
  db().prepare("UPDATE products SET stock = MIN(?, MAX(0, stock + ?)) WHERE id = ? AND stock IS NOT NULL").run(MAX_STOCK, delta, id);
  return getProduct(id);
}

export async function deleteProduct(id: number) {
  if (onVercel) {
    await writeCloudProducts((await readCloudProducts()).filter((p) => p.id !== id));
    return;
  }
  db().prepare("DELETE FROM products WHERE id = ?").run(id);
}

export function parseProductInput(value: unknown): ProductInput | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  const title = String(p.title ?? "").trim().slice(0, 120);
  const description = String(p.description ?? "").trim().slice(0, 1200);
  const category = String(p.category ?? "Doces").trim().slice(0, 60) || "Doces";
  const image = String(p.image ?? "").trim();
  const price = Number(p.price);
  const promoPrice = p.promoPrice === "" || p.promoPrice == null ? null : Number(p.promoPrice);
  if (!title || !Number.isInteger(price) || price <= 0 || (promoPrice !== null && (!Number.isInteger(promoPrice) || promoPrice <= 0 || promoPrice >= price))) return null;
  const stock = parseStock(p.stock);
  if (stock === undefined) return null;
  if (image && !/^\/(uploads|api\/images)\/[a-zA-Z0-9._-]+$/.test(image)) return null;
  return { title, description, category, image, price, promoPrice, featured: p.featured === true, active: p.active !== false, stock };
}
