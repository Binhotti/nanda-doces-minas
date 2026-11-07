import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listEntries, parseFinanceInput, saveEntry } from "@/lib/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  return NextResponse.json(await listEntries());
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  const input = parseFinanceInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Confira o valor, a data e a descrição." }, { status: 400 });
  return NextResponse.json(await saveEntry(input), { status: 201 });
}
