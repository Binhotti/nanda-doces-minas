import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { CATEGORIES, PAYMENT_METHODS, isValidDate, type FinanceEntry, type FinanceInput } from "@/lib/finance-shared";

// Mesma estratégia do catálogo: SQLite no computador e um arquivo privado no Vercel Blob na Vercel.
const onVercel = Boolean(process.env.VERCEL);
const financePath = "catalog/finance.json";
const cloudStorageReady = Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);

async function readCloudEntries(): Promise<FinanceEntry[]> {
  if (!cloudStorageReady) return [];
  const result = await get(financePath, { access: "private", useCache: false });
  if (!result?.stream) return [];
  const entries: unknown = await new Response(result.stream).json();
  if (!Array.isArray(entries)) throw new Error("Faturamento armazenado inválido.");
  return entries as FinanceEntry[];
}

async function writeCloudEntries(entries: FinanceEntry[]) {
  if (!cloudStorageReady) throw new Error("Armazenamento do faturamento não configurado.");
  await put(financePath, JSON.stringify(entries), { access: "private", allowOverwrite: true, contentType: "application/json" });
}

let database: DatabaseSync | undefined;

function db() {
  if (!database) {
    const dir = path.join(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    database = new DatabaseSync(path.join(dir, "products.sqlite"));
    database.exec(`CREATE TABLE IF NOT EXISTS finance_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('in', 'out')),
      amount INTEGER NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      method TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  }
  return database;
}

const byNewest = (a: FinanceEntry, b: FinanceEntry) => b.date.localeCompare(a.date) || b.id - a.id;

export async function listEntries(): Promise<FinanceEntry[]> {
  if (onVercel) return (await readCloudEntries()).sort(byNewest);
  return (db().prepare("SELECT * FROM finance_entries ORDER BY date DESC, id DESC").all() as unknown as FinanceEntry[]);
}

export async function getEntry(id: number): Promise<FinanceEntry | null> {
  if (onVercel) return (await readCloudEntries()).find((e) => e.id === id) ?? null;
  return (db().prepare("SELECT * FROM finance_entries WHERE id = ?").get(id) as unknown as FinanceEntry | undefined) ?? null;
}

export async function saveEntry(input: FinanceInput, id?: number): Promise<FinanceEntry> {
  if (onVercel) {
    const entries = await readCloudEntries();
    const existing = id ? entries.find((e) => e.id === id) : null;
    const entry: FinanceEntry = { ...input, id: id ?? Math.max(0, ...entries.map((e) => e.id)) + 1, createdAt: existing?.createdAt ?? new Date().toISOString() };
    await writeCloudEntries(existing ? entries.map((e) => e.id === id ? entry : e) : [...entries, entry]);
    return entry;
  }
  if (id) {
    db().prepare("UPDATE finance_entries SET type=?, amount=?, date=?, description=?, category=?, method=?, note=? WHERE id=?").run(
      input.type, input.amount, input.date, input.description, input.category, input.method, input.note, id
    );
    return (await getEntry(id))!;
  }
  const result = db().prepare("INSERT INTO finance_entries (type, amount, date, description, category, method, note) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    input.type, input.amount, input.date, input.description, input.category, input.method, input.note
  );
  return (await getEntry(Number(result.lastInsertRowid)))!;
}

export async function deleteEntry(id: number) {
  if (onVercel) {
    await writeCloudEntries((await readCloudEntries()).filter((e) => e.id !== id));
    return;
  }
  db().prepare("DELETE FROM finance_entries WHERE id = ?").run(id);
}

const MAX_AMOUNT = 100_000_000_00; // R$ 100 milhões, só para barrar digitação errada.

export function parseFinanceInput(value: unknown): FinanceInput | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  const type = p.type === "in" || p.type === "out" ? p.type : null;
  const amount = Number(p.amount);
  const date = String(p.date ?? "").trim();
  const description = String(p.description ?? "").trim().slice(0, 140);
  const category = String(p.category ?? "").trim().slice(0, 60);
  const method = String(p.method ?? "").trim().slice(0, 40);
  const note = String(p.note ?? "").trim().slice(0, 600);
  if (!type || !description || !Number.isInteger(amount) || amount <= 0 || amount > MAX_AMOUNT || !isValidDate(date)) return null;
  // Categorias e formas de pagamento são fixas; qualquer outro texto vira vazio em vez de quebrar o relatório.
  return {
    type, amount, date, description, note,
    category: CATEGORIES[type].includes(category) ? category : "",
    method: PAYMENT_METHODS.includes(method) ? method : ""
  };
}
