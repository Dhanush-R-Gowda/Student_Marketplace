import { Metadata } from "next";
import { getAllCategories } from "@/lib/db/queries/categories";
import { query } from "@/lib/db";
import type { Listing } from "@/types";
import { BrowseClient } from "./BrowseClient";

export const metadata: Metadata = { title: "Browse Listings" };
export const dynamic = "force-dynamic";

interface BrowsePageProps {
  searchParams: Promise<{
    category?: string;
    condition?: string;
    minPrice?: string;
    maxPrice?: string;
    location?: string;
    sortBy?: string;
    page?: string;
  }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const sp = await searchParams;
  const page    = Math.max(1, parseInt(sp.page ?? "1"));
  const limit   = 20;
  const offset  = (page - 1) * limit;
  const sortBy  = sp.sortBy ?? "newest";

  const orderMap: Record<string, string> = {
    newest:     "l.created_at DESC",
    oldest:     "l.created_at ASC",
    price_asc:  "l.price ASC",
    price_desc: "l.price DESC",
  };
  const order = orderMap[sortBy] ?? "l.created_at DESC";

  // Build filter conditions
  const conditions: string[] = ["l.status = 'Available'"];
  const values: unknown[]    = [];
  let idx = 1;

  if (sp.category) {
    conditions.push(`(c.slug = $${idx} OR pc.slug = $${idx})`);
    values.push(sp.category);
    idx++;
  }
  if (sp.condition) {
    conditions.push(`l.condition = $${idx++}`);
    values.push(sp.condition);
  }
  if (sp.minPrice) {
    conditions.push(`l.price >= $${idx++}`);
    values.push(parseFloat(sp.minPrice));
  }
  if (sp.maxPrice) {
    conditions.push(`l.price <= $${idx++}`);
    values.push(parseFloat(sp.maxPrice));
  }
  if (sp.location) {
    conditions.push(`l.location ILIKE $${idx++}`);
    values.push(`%${sp.location}%`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const [countRows, listings, categories] = await Promise.all([
    query<{ total: string }>(`
      SELECT COUNT(*) AS total
      FROM listings l
      INNER JOIN users      u  ON l.seller_id   = u.id
      INNER JOIN categories c  ON l.category_id = c.id
      LEFT  JOIN categories pc ON c.parent_id   = pc.id
      ${where}
    `, values),
    query<Listing>(`
      SELECT
        l.id, l.seller_id, l.category_id, l.title, l.description,
        l.price, l.condition, l.location, l.status,
        l.created_at, l.updated_at,
        u.name        AS seller_name,
        c.name        AS category_name,
        c.slug        AS category_slug,
        (
          SELECT image_url FROM listing_images li
          WHERE li.listing_id = l.id
          ORDER BY li.display_order ASC LIMIT 1
        ) AS primary_image
      FROM listings l
      INNER JOIN users      u  ON l.seller_id   = u.id
      INNER JOIN categories c  ON l.category_id = c.id
      LEFT  JOIN categories pc ON c.parent_id   = pc.id
      ${where}
      ORDER BY ${order}
      LIMIT $${idx++} OFFSET $${idx}
    `, [...values, limit, offset]),
    getAllCategories(),
  ]);

  const total      = parseInt(countRows[0]?.total ?? "0");
  const totalPages = Math.ceil(total / limit);

  return (
    <BrowseClient
      listings={listings}
      categories={categories}
      total={total}
      page={page}
      totalPages={totalPages}
      currentFilters={sp}
    />
  );
}
