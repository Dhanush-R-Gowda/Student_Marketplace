/**
 * Semantic / Vector Search using pgvector
 *
 * Performs cosine similarity search against the `embedding` column on listings.
 * The `<=>` operator is the cosine distance operator from pgvector.
 * We convert distance → similarity: similarity = 1 - distance.
 *
 * Requires:
 *   1. pgvector extension installed in PostgreSQL
 *   2. OPENAI_API_KEY set in environment
 *   3. Listing embeddings pre-generated (via /api/listings POST or batch job)
 *
 * Graceful fallback: returns empty array if embeddings unavailable.
 */

import { query } from "@/lib/db";
import type { SearchResult, ListingStatus } from "@/types";

export interface SemanticSearchOptions {
  embedding: number[];        // query vector (1536-dim)
  status?: ListingStatus;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  location?: string;
  limit?: number;
  similarityThreshold?: number;  // 0–1; results below this are excluded
}

export interface SemanticSearchRow extends SearchResult {
  semantic_score: number;   // cosine similarity 0–1 (higher = more similar)
}

export async function semanticSearch(opts: SemanticSearchOptions): Promise<SemanticSearchRow[]> {
  const {
    embedding,
    status = "Available",
    categorySlug,
    minPrice,
    maxPrice,
    condition,
    location,
    limit = 40,
    similarityThreshold = 0.25,  // ignore very dissimilar results
  } = opts;

  const conditions: string[] = ["l.embedding IS NOT NULL"];
  const values: unknown[]    = [];
  let idx = 1;

  // The embedding vector as a PostgreSQL literal
  const embeddingLiteral = `'[${embedding.join(",")}]'::vector`;

  // Status
  conditions.push(`l.status = $${idx++}`);
  values.push(status);

  // Category
  if (categorySlug) {
    conditions.push(`(c.slug = $${idx} OR pc.slug = $${idx})`);
    values.push(categorySlug);
    idx++;
  }

  // Condition
  if (condition) {
    conditions.push(`l.condition = $${idx++}`);
    values.push(condition);
  }

  // Price
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

  // Similarity threshold
  // cosine distance: 0 = identical, 2 = opposite
  // similarity = 1 - (distance / 2) maps to 0–1
  const distanceThreshold = 2 * (1 - similarityThreshold);
  conditions.push(`(l.embedding <=> ${embeddingLiteral}) < $${idx++}`);
  values.push(distanceThreshold);

  const where = `WHERE ${conditions.join(" AND ")}`;

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
      -- Convert cosine distance to similarity score (0–1)
      1.0 - ((l.embedding <=> ${embeddingLiteral}) / 2.0) AS semantic_score
    FROM listings l
    INNER JOIN users      u  ON l.seller_id   = u.id
    INNER JOIN categories c  ON l.category_id = c.id
    LEFT  JOIN categories pc ON c.parent_id   = pc.id
    ${where}
    ORDER BY l.embedding <=> ${embeddingLiteral}
    LIMIT $${idx}
  `;

  values.push(limit);

  try {
    return await query<SemanticSearchRow>(sql, values);
  } catch (err) {
    // pgvector not installed or no embeddings — return empty gracefully
    console.warn("[SemanticSearch] Vector search failed:", (err as Error).message);
    return [];
  }
}
