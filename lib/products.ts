import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { get, put } from "@vercel/blob";

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
  createdAt: string;
};

const onVercel = Boolean(process.env.VERCEL);
const catalogPath = "catalog/products.json";

async function readCloudProducts(): Promise<Product[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  const result = await get(catalogPath, { access: "private", useCache: false });
  if (!result?.stream) return [];
  const products: unknown = await new Response(result.stream).json();
  if (!Array.isArray(products)) throw new Error("Catálogo armazenado inválido.");
  return products as Product[];
}

async function writeCloudProducts(products: Product[]) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Armazenamento do catálogo não configurado.");
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
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  }
  return database;
}

function normalize(row: Record<string, unknown>): Product {
  return { ...row, featured: Boolean(row.featured), active: Boolean(row.active) } as Product;
}

export async function listProducts(includeInactive = false): Promise<Product[]> {
  if (onVercel) {
    const products = await readCloudProducts();
    return products.filter((p) => includeInactive || p.active).sort((a, b) => Number(b.featured) - Number(a.featured) || b.id - a.id);
  }
  const rows = db().prepare(`SELECT * FROM products ${includeInactive ? "" : "WHERE active = 1"} ORDER BY featured DESC, id DESC`).all();
  return rows.map((row) => normalize(row as Record<string, unknown>));
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
    db().prepare(`UPDATE products SET title=?, description=?, image=?, price=?, promoPrice=?, category=?, featured=?, active=? WHERE id=?`).run(
      input.title, input.description, input.image, input.price, input.promoPrice, input.category, Number(input.featured), Number(input.active), id
    );
    return (await getProduct(id))!;
  }
  const result = db().prepare(`INSERT INTO products (title, description, image, price, promoPrice, category, featured, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    input.title, input.description, input.image, input.price, input.promoPrice, input.category, Number(input.featured), Number(input.active)
  );
  return (await getProduct(Number(result.lastInsertRowid)))!;
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
  if (image && !/^\/(uploads|api\/images)\/[a-zA-Z0-9._-]+$/.test(image)) return null;
  return { title, description, category, image, price, promoPrice, featured: p.featured === true, active: p.active !== false };
}
