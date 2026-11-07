import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { HOME_LIMIT_MESSAGE, MAX_HOME_PRODUCTS } from "@/lib/home";
import { homeProductCount, listProducts, parseProductInput, saveProduct } from "@/lib/products";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await listProducts(await isAdmin()));
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  const input = parseProductInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Confira título, preço e promoção." }, { status: 400 });
  if (input.featured && input.active && (await homeProductCount()) >= MAX_HOME_PRODUCTS) return NextResponse.json({ error: HOME_LIMIT_MESSAGE }, { status: 409 });
  return NextResponse.json(await saveProduct(input), { status: 201 });
}
