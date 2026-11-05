import { isAdmin, credentialsConfigured } from "@/lib/auth";
import { listProducts } from "@/lib/products";
import AdminPanel from "@/components/admin-panel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authenticated = await isAdmin();
  return <AdminPanel authenticated={authenticated} configured={credentialsConfigured()} initialProducts={authenticated ? await listProducts(true) : []} />;
}
