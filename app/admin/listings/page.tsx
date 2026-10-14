import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminListings } from "@/lib/db/queries/listings";
import { AdminListingsClient } from "./AdminListingsClient";

export const metadata: Metadata = { title: "Manage Listings" };
export const dynamic = "force-dynamic";

interface Props { searchParams: Promise<{ status?: string; page?: string }> }

export default async function AdminListingsPage({ searchParams }: Props) {
  try { await requireAdmin(); } catch { redirect("/login"); }
  const sp     = await searchParams;
  // Pass status as-is — getAdminListings validates it against the allowlist
  // internally and ignores unrecognised values (including "all").
  const status = sp.status;
  const page   = Math.max(1, parseInt(sp.page ?? "1"));

  const { listings, total } = await getAdminListings({ status, page, limit: 20 });

  // The display value for the active tab: keep "all" when no valid status given.
  const currentStatus = status ?? "all";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Listings</h1>
      <AdminListingsClient listings={listings} total={total} currentStatus={currentStatus} />
    </div>
  );
}
