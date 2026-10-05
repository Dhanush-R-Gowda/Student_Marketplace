/**
 * Hybrid Search Orchestrator
 *
 * Pipeline:
 *   USER QUERY
 *     │
 *     ├─► Extract structured filters (price, condition, category hint)
 *     │
 *     ├─► Keyword search   (PostgreSQL FTS / tsvector)
 *     │
 *     ├─► Semantic search  (pgvector cosine similarity) ← optional
 *     │
 *     └─► Merge + Rank     (weighted formula, deduplication)
 *              │
 *              └─► Apply hard filters + pagination
 *                       │
 *                       └─► Final results
 */

import { keywordSearch }        from "./keyword";
import { semanticSearch }       from "./semantic";
import { mergeAndRank }         from "./ranking";
import { extractFiltersFromQuery } from "./filters";
import { generateEmbedding, isSemanticSearchAvailable } from "@/lib/embeddings/generate";
import { query }                from "@/lib/db";
import type { SearchResult, ListingStatus, ListingCondition, SearchResponse } from "@/types";

export interface HybridSearchParams {
  q?:           string;
  categorySlug?: string;
  minPrice?:    number;
  maxPrice?:    number;
  condition?:   ListingCondition;
  location?:    string;
  status?:      ListingStatus;
  sortBy?:      "relevance" | "newest" | "price_asc" | "price_desc";
  page?:        number;
  limit?:       number;
}

export async function hybridSearch(params: HybridSearchParams): Promise<SearchResponse> {
  const {
    q           = "",
    categorySlug,
    minPrice,
    maxPrice,
    condition,
    location,
    status      = "Available",
    sortBy      = q ? "relevance" : "newest",
    page        = 1,
    limit       = 20,
  } = params;

  const offset = (page - 1) * limit;

  // ── Case 1: No query — pure filter browse ──────────────────────────────
  if (!q.trim()) {
    return await filterOnlySearch({ categorySlug, minPrice, maxPrice, condition, location, status, sortBy, page, limit });
  }

  // ── Case 2: Query present — hybrid pipeline ────────────────────────────

  // Step 1: Extract implicit filters from the query text
  const extracted = extractFiltersFromQuery(q);

  // Merge: explicit params override extracted hints
  const effectiveMinPrice  = minPrice  ?? extracted.minPrice;
  const effectiveMaxPrice  = maxPrice  ?? extracted.maxPrice;
  const effectiveCondition = condition ?? extracted.condition;
  const effectiveCategorySlug = categorySlug ?? undefined; // don't auto-apply hint as hard filter

  const filterContext = {
    categoryHint: extracted.categoryHint,
    minPrice:     effectiveMinPrice,
    maxPrice:     effectiveMaxPrice,
  };

  // Step 2: Run keyword search (always)
  const keywordRows = await keywordSearch({
    q,
    status,
    categorySlug: effectiveCategorySlug,
    condition:    effectiveCondition,
    minPrice:     effectiveMinPrice,
    maxPrice:     effectiveMaxPrice,
    location,
    limit:        60, // fetch more than needed — ranking will trim
  });

  // Step 3: Run semantic search (if API key available)
  let semanticRows: Awaited<ReturnType<typeof semanticSearch>> = [];
  let searchMode: SearchResponse["searchMode"] = "keyword";

  if (isSemanticSearchAvailable()) {
    const embedding = await generateEmbedding(q);
    if (embedding) {
      semanticRows = await semanticSearch({
        embedding,
        status,
        categorySlug:        effectiveCategorySlug,
        condition:           effectiveCondition,
        minPrice:            effectiveMinPrice,
        maxPrice:            effectiveMaxPrice,
        location,
        limit:               60,
        similarityThreshold: 0.20,
      });
      searchMode = "hybrid";
    }
  }

  // Step 4: Merge and rank
  const ranked = mergeAndRank(keywordRows, semanticRows, filterContext);

  // Step 5: If sortBy is not relevance, re-sort after ranking
  let finalResults: SearchResult[] = ranked;

  if (sortBy === "newest") {
    finalResults = [...ranked].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } else if (sortBy === "price_asc") {
    finalResults = [...ranked].sort((a, b) => a.price - b.price);
  } else if (sortBy === "price_desc") {
    finalResults = [...ranked].sort((a, b) => b.price - a.price);
  }

  const total = finalResults.length;
  const paginated = finalResults.slice(offset, offset + limit);

  return {
    listings:   paginated,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    searchMode,
  };
}

// ── Pure filter search (no text query) ──────────────────────────────────────
async function filterOnlySearch(params: {
  categorySlug?: string;
  minPrice?:    number;
  maxPrice?:    number;
  condition?:   string;
  location?:    string;
  status:       string;
  sortBy:       string;
  page:         number;
  limit:        number;
}): Promise<SearchResponse> {
  const { categorySlug, minPrice, maxPrice, condition, location, status, sortBy, page, limit } = params;
  const offset = (page - 1) * limit;

  const conditions: string[] = [`l.status = $1`];
  const values: unknown[]    = [status];
  let idx = 2;

  if (categorySlug) {
    conditions.push(`(c.slug = $${idx} OR pc.slug = $${idx})`);
    values.push(categorySlug); idx++;
  }
  if (condition) {
    conditions.push(`l.condition = $${idx++}`);
    values.push(condition);
  }
  if (minPrice !== undefined) {
    conditions.push(`l.price >= $${idx++}`);
    values.push(minPrice);
  }
  if (maxPrice !== undefined) {
    conditions.push(`l.price <= $${idx++}`);
    values.push(maxPrice);
  }
  if (location) {
    conditions.push(`l.location ILIKE $${idx++}`);
    values.push(`%${location}%`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const orderMap: Record<string, string> = {
    newest:     "l.created_at DESC",
    price_asc:  "l.price ASC",
    price_desc: "l.price DESC",
  };
  const order = orderMap[sortBy] ?? "l.created_at DESC";

  const countRows = await query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM listings l
     INNER JOIN users      u  ON l.seller_id   = u.id
     INNER JOIN categories c  ON l.category_id = c.id
     LEFT  JOIN categories pc ON c.parent_id   = pc.id
     ${where}`,
    values
  );

  const total = parseInt(countRows[0]?.total ?? "0");

  const listings = await query<SearchResult>(`
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
      ) AS primary_image
    FROM listings l
    INNER JOIN users      u  ON l.seller_id   = u.id
    INNER JOIN categories c  ON l.category_id = c.id
    LEFT  JOIN categories pc ON c.parent_id   = pc.id
    ${where}
    ORDER BY ${order}
    LIMIT $${idx++} OFFSET $${idx}
  `, [...values, limit, offset]);

  return {
    listings,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    searchMode: "filter-only",
  };
}
