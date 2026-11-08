import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Storefront from "@/components/storefront";
import { getProduct, listProducts } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function findVisibleProduct(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const product = await getProduct(id);
  return product?.active ? product : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await findVisibleProduct((await params).id);
  if (!product) return { title: "Produto não encontrado | Nanda Doces de Minas" };
  return {
    title: `${product.title} | Nanda Doces de Minas`,
    description: product.description.slice(0, 160) || "Conheça este doce da Nanda Doces de Minas.",
    openGraph: product.image ? { images: [product.image] } : undefined
  };
}

export default async function ProdutoPage({ params }: Props) {
  const product = await findVisibleProduct((await params).id);
  if (!product) notFound();
  return <Storefront products={await listProducts()} catalogPage productId={product.id} />;
}
