import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listProducts, parseProductInput, saveProduct } from "@/lib/products";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(listProducts(await isAdmin()));
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  const input = parseProductInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Confira título, preço e promoção." }, { status: 400 });
  return NextResponse.json(saveProduct(input), { status: 201 });
}
