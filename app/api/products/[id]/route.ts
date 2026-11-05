import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteProduct, getProduct, parseProductInput, saveProduct } from "@/lib/products";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || !(await getProduct(id))) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  const input = parseProductInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Confira título, preço e promoção." }, { status: 400 });
  return NextResponse.json(await saveProduct(input, id));
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || !(await getProduct(id))) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  await deleteProduct(id);
  return NextResponse.json({ ok: true });
}
