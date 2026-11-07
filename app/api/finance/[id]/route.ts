import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteEntry, getEntry, parseFinanceInput, saveEntry } from "@/lib/finance";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || !(await getEntry(id))) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  const input = parseFinanceInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Confira o valor, a data e a descrição." }, { status: 400 });
  return NextResponse.json(await saveEntry(input, id));
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || !(await getEntry(id))) return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
  await deleteEntry(id);
  return NextResponse.json({ ok: true });
}
