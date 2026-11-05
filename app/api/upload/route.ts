import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size > 4 * 1024 * 1024 || file.size === 0) {
    return NextResponse.json({ error: "Escolha uma imagem de até 4 MB." }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  const extension = jpg ? "jpg" : png ? "png" : webp ? "webp" : null;
  if (!extension) return NextResponse.json({ error: "Use JPG, PNG ou WebP." }, { status: 400 });
  const filename = `${randomUUID()}.${extension}`;
  if (process.env.VERCEL) {
    if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Armazenamento de imagens não configurado." }, { status: 503 });
    await put(`images/${filename}`, bytes, { access: "private", contentType: extension === "jpg" ? "image/jpeg" : `image/${extension}` });
    return NextResponse.json({ url: `/api/images/${filename}` });
  }
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);
  return NextResponse.json({ url: `/uploads/${filename}` });
}
