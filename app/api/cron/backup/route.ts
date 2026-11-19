import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runBackup } from "@/lib/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sem segredo configurado, ninguém entra
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

// A Vercel chama esta rota todo dia (vercel.json) e envia CRON_SECRET no cabeçalho Authorization.
// A cópia só é feita se a última tiver 3 dias ou mais. Com ?force=1 ela é feita na hora.
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await runBackup({ force: new URL(request.url).searchParams.get("force") === "1" })) });
  } catch (error) {
    console.error("Falha no backup", error);
    return NextResponse.json({ error: "Falha ao criar o backup." }, { status: 500 });
  }
}
