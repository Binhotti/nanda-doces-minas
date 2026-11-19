import { del, get, list, put } from "@vercel/blob";

// Cópias de segurança do catálogo e do faturamento, guardadas no mesmo Blob em backups/AAAA-MM-DD/.
// O arquivo em catalog/ é sobrescrito a cada edição; estas cópias permitem voltar atrás se uma gravação sair errada.
const SOURCES = ["catalog/products.json", "catalog/finance.json"];
export const BACKUP_EVERY_DAYS = 3;
/** Quantas datas de backup ficam guardadas (10 cópias, uma a cada 3 dias, cobrem cerca de 30 dias). */
export const BACKUP_KEEP = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const datePattern = /^backups\/(\d{4}-\d{2}-\d{2})\//;

async function listBackups() {
  const blobs: { pathname: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "backups/", cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

export async function runBackup({ force = false, now = new Date() }: { force?: boolean; now?: Date } = {}) {
  const blobs = await listBackups();
  const dates = [...new Set(blobs.map((blob) => datePattern.exec(blob.pathname)?.[1]).filter((date): date is string => Boolean(date)))].sort();
  const today = now.toISOString().slice(0, 10);
  const latest = dates.at(-1);
  if (!force && latest && (Date.parse(today) - Date.parse(latest)) / DAY_MS < BACKUP_EVERY_DAYS) return { skipped: true as const, latest };

  const saved: { path: string; bytes: number }[] = [];
  for (const source of SOURCES) {
    const result = await get(source, { access: "private", useCache: false });
    if (!result?.stream) continue; // ainda não existe (por exemplo, nenhum lançamento de faturamento)
    const body = await new Response(result.stream).text();
    JSON.parse(body); // não guarda como backup um arquivo corrompido
    const path = `backups/${today}/${source.split("/").pop()}`;
    await put(path, body, { access: "private", allowOverwrite: true, contentType: "application/json" });
    saved.push({ path, bytes: body.length });
  }
  if (!saved.length) throw new Error("Nada para copiar: nenhum arquivo de dados encontrado.");

  // Mantém só as últimas BACKUP_KEEP datas.
  const keep = new Set([...new Set([...dates, today])].sort().slice(-BACKUP_KEEP));
  const old = blobs.map((blob) => blob.pathname).filter((pathname) => { const date = datePattern.exec(pathname)?.[1]; return date && !keep.has(date); });
  if (old.length) await del(old);
  return { skipped: false as const, day: today, saved, removed: old.length };
}
