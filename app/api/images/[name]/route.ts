import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(name)) return new NextResponse("Not found", { status: 404 });
  const result = await get(`images/${name}`, { access: "private" });
  if (!result?.stream) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(result.stream, {
    headers: { "Content-Type": result.blob.contentType || "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" }
  });
}
