/**
 * Hybrid Relevance Ranking
 *
 * Combines scores from keyword search, semantic search, and structured
 * signals into a single final_score for each listing.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  final_score =                                                   │
 * │    0.55 × semantic_score        (vector similarity)             │
 * │  + 0.25 × keyword_score         (PostgreSQL ts_rank_cd)         │
 * │  + 0.10 × category_score        (category hint match)           │
 * │  + 0.05 × price_score           (within mentioned price range)  │
 * │  + 0.05 × recency_score         (newer = slightly preferred)    │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * All input scores are normalised to [0, 1] before weighting.
 * The formula weights are documented and explainable for academic review.
 */

import type { SearchResult } from "@/types";
import type { KeywordSearchRow } from "./keyword";
import type { SemanticSearchRow } from "./semantic";

// Documented weight constants
export const WEIGHTS = {
  semantic:  0.55,
  keyword:   0.25,
  category:  0.10,
  price:     0.05,
  recency:   0.05,
} as const;

export interface RankedResult extends SearchResult {
  final_score:    number;
  semantic_score: number;
  keyword_score:  number;
  match_label:    string;   // human-readable label shown in UI
}

interface RankingContext {
  categoryHint?: string;   // slug extracted from query
  maxPrice?:     number;   // extracted from query
  minPrice?:     number;
}

/**
 * Merge keyword and semantic results, deduplicate, and rank.
 */
export function mergeAndRank(
  keywordRows:  KeywordSearchRow[],
  semanticRows: SemanticSearchRow[],
  context:      RankingContext = {}
): RankedResult[] {
  // Build a unified map keyed by listing id
  const map = new Map<string, Partial<KeywordSearchRow & SemanticSearchRow>>();

  for (const row of keywordRows) {
    map.set(row.id, { ...row, keyword_rank: row.keyword_rank, semantic_score: 0 });
  }

  for (const row of semanticRows) {
    const existing = map.get(row.id);
    if (existing) {
      // Merge — listing appeared in both pipelines
      map.set(row.id, {
        ...existing,
        semantic_score: row.semantic_score,
      });
    } else {
      map.set(row.id, { ...row, keyword_rank: 0, semantic_score: row.semantic_score });
    }
  }

  // Normalise ts_rank keyword scores to [0, 1]
  const allKeywordScores = Array.from(map.values()).map(r => r.keyword_rank ?? 0);
  const maxKw = Math.max(...allKeywordScores, 0.001);

  // Compute recency scores (decay: newest = 1.0, 60-day-old = ~0.1)
  const now = Date.now();
  const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

  const ranked: RankedResult[] = [];

  for (const [, row] of map) {
    const r = row as KeywordSearchRow & SemanticSearchRow;

    const semanticScore = Math.min(1, Math.max(0, r.semantic_score ?? 0));
    const keywordScore  = Math.min(1, (r.keyword_rank ?? 0) / maxKw);

    // Category match: 1 if listing category matches the hint, 0 otherwise
    const categoryScore = context.categoryHint
      ? (r.category_slug === context.categoryHint ? 1 : 0)
      : 0;

    // Price score: 1 if within extracted price range, 0.5 if close, 0 otherwise
    const priceScore = computePriceScore(r.price, context.minPrice, context.maxPrice);

    // Recency score: 1.0 for today, decays exponentially
    const ageMs        = now - new Date(r.created_at).getTime();
    const recencyScore = Math.exp(-ageMs / SIXTY_DAYS_MS);

    const finalScore =
      WEIGHTS.semantic  * semanticScore  +
      WEIGHTS.keyword   * keywordScore   +
      WEIGHTS.category  * categoryScore  +
      WEIGHTS.price     * priceScore     +
      WEIGHTS.recency   * recencyScore;

    ranked.push({
      ...(r as SearchResult),
      final_score:    parseFloat(finalScore.toFixed(4)),
      semantic_score: parseFloat(semanticScore.toFixed(4)),
      keyword_score:  parseFloat(keywordScore.toFixed(4)),
      match_label:    scoreToLabel(finalScore, Boolean(r.semantic_score)),
    });
  }

  // Sort by final score descending
  ranked.sort((a, b) => b.final_score - a.final_score);

  return ranked;
}

function computePriceScore(
  price: number,
  minPrice?: number,
  maxPrice?: number
): number {
  if (maxPrice === undefined && minPrice === undefined) return 0.5; // neutral

  const inMax = maxPrice === undefined || price <= maxPrice;
  const inMin = minPrice === undefined || price >= minPrice;

  if (inMax && inMin) return 1.0;           // exactly within range
  if (maxPrice !== undefined && price > maxPrice) {
    // Penalise proportionally — 1.5× over budget = 0
    const overBy = (price - maxPrice) / maxPrice;
    return Math.max(0, 1 - overBy);
  }
  return 0.5;
}

function scoreToLabel(score: number, hasSemantic: boolean): string {
  if (!hasSemantic) return "";          // no label when only keyword search
  if (score >= 0.65) return "Best Match";
  if (score >= 0.45) return "Great Match";
  if (score >= 0.30) return "Good Match";
  return "";
}
