import { query, queryOne } from "@/lib/db";
import type { Category } from "@/types";

// ---------------------------------------------------------------------------
// Category queries
// ---------------------------------------------------------------------------

/** Fetch all top-level categories with their subcategories */
export async function getAllCategories(): Promise<Category[]> {
  const rows = await query<Category>(`
    SELECT id, name, slug, parent_id, icon, created_at
    FROM categories
    ORDER BY parent_id NULLS FIRST, name ASC
  `);

  // Build tree: top-level categories with nested subcategories
  const topLevel = rows.filter((c) => c.parent_id === null);
  const subMap: Record<number, Category[]> = {};

  for (const c of rows.filter((c) => c.parent_id !== null)) {
    if (!subMap[c.parent_id!]) subMap[c.parent_id!] = [];
    subMap[c.parent_id!].push(c);
  }

  return topLevel.map((c) => ({
    ...c,
    subcategories: subMap[c.id] ?? [],
  }));
}

/** Fetch a single category by slug */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return queryOne<Category>(
    `SELECT id, name, slug, parent_id, icon, created_at
     FROM categories
     WHERE slug = $1`,
    [slug]
  );
}

/** Fetch a single category by id */
export async function getCategoryById(id: number): Promise<Category | null> {
  return queryOne<Category>(
    `SELECT id, name, slug, parent_id, icon, created_at
     FROM categories
     WHERE id = $1`,
    [id]
  );
}

/** Flat list of all categories (no nesting) — for select dropdowns */
export async function getAllCategoriesFlat(): Promise<Category[]> {
  return query<Category>(`
    SELECT c.id, c.name, c.slug, c.parent_id, c.icon, c.created_at,
           pc.name AS parent_name
    FROM categories c
    LEFT JOIN categories pc ON c.parent_id = pc.id
    ORDER BY pc.name NULLS FIRST, c.name ASC
  `);
}
