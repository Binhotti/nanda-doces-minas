import { NextResponse } from "next/server";
import { passwordMatches, setAdminCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({}));
  if (typeof password !== "string" || !passwordMatches(password)) {
    return NextResponse.json({ error: "Senha inválida ou acesso ainda não configurado." }, { status: 401 });
  }
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
