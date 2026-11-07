import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { HOME_LIMIT_MESSAGE, MAX_HOME_PRODUCTS } from "@/lib/home";
import { deleteProduct, getProduct, homeProductCount, parseProductInput, saveProduct } from "@/lib/products";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || !(await getProduct(id))) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  const input = parseProductInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Confira título, preço e promoção." }, { status: 400 });
  if (input.featured && input.active && (await homeProductCount(id)) >= MAX_HOME_PRODUCTS) return NextResponse.json({ error: HOME_LIMIT_MESSAGE }, { status: 409 });
  return NextResponse.json(await saveProduct(input, id));
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || !(await getProduct(id))) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  await deleteProduct(id);
  return NextResponse.json({ ok: true });
}
