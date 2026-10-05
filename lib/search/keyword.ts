/**
 * Keyword / Full-Text Search using PostgreSQL tsvector
 *
 * Uses the GIN-indexed `searchable_text` column on listings.
 * Falls back to ILIKE pattern match if the FTS query is malformed.
 *
 * Returns rows with a ts_rank score so they can be combined with
 * semantic scores in the hybrid ranker.
 */

import { query } from "@/lib/db";
import type { SearchResult, ListingCondition, ListingStatus } from "@/types";

export interface KeywordSearchOptions {
  q: string;
  status?: ListingStatus;
  categorySlug?: string;
  condition?: ListingCondition;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
}

export interface KeywordSearchRow extends SearchResult {
  keyword_rank: number;
}

export async function keywordSearch(opts: KeywordSearchOptions): Promise<KeywordSearchRow[]> {
  const {
    q,
    status = "Available",
    categorySlug,
    condition,
    minPrice,
    maxPrice,
    location,
    limit = 40,
    offset = 0,
  } = opts;

  const conditions: string[] = [];
  const values: unknown[]    = [];
  let idx = 1;

  // Status filter
  conditions.push(`l.status = $${idx++}`);
  values.push(status);

  // Category filter
  if (categorySlug) {
    conditions.push(`(c.slug = $${idx} OR pc.slug = $${idx})`);
    values.push(categorySlug);
    idx++;
  }

  // Condition filter
  if (condition) {
    conditions.push(`l.condition = $${idx++}`);
    values.push(condition);
  }

  // Price range
  if (minPrice !== undefined) {
    conditions.push(`l.price >= $${idx++}`);
    values.push(minPrice);
  }
  if (maxPrice !== undefined) {
    conditions.push(`l.price <= $${idx++}`);
    values.push(maxPrice);
  }

  // Location
  if (location) {
    conditions.push(`l.location ILIKE $${idx++}`);
    values.push(`%${location}%`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  // Build tsvector query from the search text
  // websearch_to_tsquery is safe against malformed input
  const tsQuery = `websearch_to_tsquery('english', $${idx++})`;
  values.push(q);

  // ts_rank_cd uses cover density — better for short listings
  const sql = `
    SELECT
      l.id, l.seller_id, l.category_id, l.title, l.description,
      l.price, l.condition, l.location, l.status,
      l.created_at, l.updated_at,
      u.name        AS seller_name,
      u.email       AS seller_email,
      u.college     AS seller_college,
      c.name        AS category_name,
      c.slug        AS category_slug,
      (
        SELECT image_url FROM listing_images li
        WHERE li.listing_id = l.id
        ORDER BY li.display_order ASC LIMIT 1
      )             AS primary_image,
      -- FTS relevance score (0–1 range after normalisation)
      COALESCE(
        ts_rank_cd(l.searchable_text, ${tsQuery}, 32),
        0
      )             AS keyword_rank
    FROM listings l
    INNER JOIN users      u  ON l.seller_id   = u.id
    INNER JOIN categories c  ON l.category_id = c.id
    LEFT  JOIN categories pc ON c.parent_id   = pc.id
    ${where}
      AND (
        l.searchable_text @@ ${tsQuery}
        OR l.title       ILIKE $${idx}
        OR l.description ILIKE $${idx}
      )
    ORDER BY keyword_rank DESC, l.created_at DESC
    LIMIT $${idx + 1} OFFSET $${idx + 2}
  `;

  // Add ILIKE pattern and pagination params
  const ilikePat = `%${q}%`;
  values.push(ilikePat, limit, offset);

  try {
    return await query<KeywordSearchRow>(sql, values);
  } catch (err) {
    // If FTS query syntax fails, fall back to pure ILIKE
    console.warn("[KeywordSearch] FTS failed, falling back to ILIKE:", (err as Error).message);
    return await ilikeFallback(opts);
  }
}

async function ilikeFallback(opts: KeywordSearchOptions): Promise<KeywordSearchRow[]> {
  const { q, status = "Available", limit = 40, offset = 0 } = opts;
  const pat = `%${q}%`;

  return query<KeywordSearchRow>(`
    SELECT
      l.id, l.seller_id, l.category_id, l.title, l.description,
      l.price, l.condition, l.location, l.status,
      l.created_at, l.updated_at,
      u.name    AS seller_name,
      c.name    AS category_name,
      c.slug    AS category_slug,
      (
        SELECT image_url FROM listing_images li
        WHERE li.listing_id = l.id
        ORDER BY li.display_order ASC LIMIT 1
      ) AS primary_image,
      0.1::FLOAT AS keyword_rank
    FROM listings l
    INNER JOIN users      u ON l.seller_id   = u.id
    INNER JOIN categories c ON l.category_id = c.id
    WHERE l.status = $1
      AND (l.title ILIKE $2 OR l.description ILIKE $2)
    ORDER BY l.created_at DESC
    LIMIT $3 OFFSET $4
  `, [status, pat, limit, offset]);
}
