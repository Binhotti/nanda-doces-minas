import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { HOME_LIMIT_MESSAGE, MAX_HOME_PRODUCTS } from "@/lib/home";
import { MAX_STOCK } from "@/lib/stock";
import { adjustStock, deleteProduct, getProduct, homeProductCount, parseProductInput, parseStock, saveProduct, setStock } from "@/lib/products";

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

// Ajuste rápido de estoque: { delta: 1 } soma, { delta: -1 } subtrai, { stock: 12 } define e { stock: null } deixa ilimitado.
export async function PATCH(request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  const id = Number((await context.params).id);
  const product = Number.isInteger(id) ? await getProduct(id) : null;
  if (!product) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  const body: unknown = await request.json().catch(() => null);
  const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
  if ("delta" in data) {
    const delta = Number(data.delta);
    if (!Number.isInteger(delta) || Math.abs(delta) > MAX_STOCK) return NextResponse.json({ error: "Quantidade inválida." }, { status: 400 });
    if (product.stock === null) return NextResponse.json({ error: "Este produto está com estoque ilimitado. Defina uma quantidade para controlar." }, { status: 409 });
    return NextResponse.json(await adjustStock(id, delta));
  }
  if ("stock" in data) {
    const stock = parseStock(data.stock);
    if (stock === undefined) return NextResponse.json({ error: "Informe um estoque entre 0 e 99999." }, { status: 400 });
    return NextResponse.json(await setStock(id, stock));
  }
  return NextResponse.json({ error: "Informe delta ou stock." }, { status: 400 });
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || !(await getProduct(id))) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  await deleteProduct(id);
  return NextResponse.json({ ok: true });
}
