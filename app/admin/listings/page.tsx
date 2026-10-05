import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { AdminListingsClient } from "./AdminListingsClient";
import type { Listing } from "@/types";

export const metadata: Metadata = { title: "Manage Listings" };
export const dynamic = "force-dynamic";

interface Props { searchParams: Promise<{ status?: string; page?: string }> }

export default async function AdminListingsPage({ searchParams }: Props) {
  try { await requireAdmin(); } catch { redirect("/login"); }
  const sp     = await searchParams;
  const status = sp.status ?? "all";
  const page   = Math.max(1, parseInt(sp.page ?? "1"));
  const limit  = 20;
  const offset = (page - 1) * limit;

  const where = status !== "all" ? `WHERE l.status = '${status}'` : "";

  const [countRows, listings] = await Promise.all([
    query<{ total: string }>(`SELECT COUNT(*) AS total FROM listings l ${where}`),
    query<Listing>(`
      SELECT l.id, l.seller_id, l.title, l.price, l.condition, l.location, l.status,
             l.created_at, u.name AS seller_name, c.name AS category_name,
             (SELECT image_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.display_order ASC LIMIT 1) AS primary_image
      FROM listings l
      INNER JOIN users u ON l.seller_id = u.id
      INNER JOIN categories c ON l.category_id = c.id
      ${where}
      ORDER BY l.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Listings</h1>
      <AdminListingsClient listings={listings} total={parseInt(countRows[0]?.total ?? "0")} currentStatus={status} />
    </div>
  );
}
