import Storefront from "@/components/storefront";
import { listProducts } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Home() {
  return <Storefront products={listProducts()} />;
}
