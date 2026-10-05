/**
 * Natural-language filter extraction
 *
 * Parses a free-text query for structured hints:
 *   "calculator under 800" → { maxPrice: 800 }
 *   "used laptop"          → { condition: "Good" }
 *   "cheap textbooks"      → { maxPrice: 500 } (heuristic)
 *   "free items"           → { maxPrice: 0 }
 *
 * These extracted filters are applied on top of semantic + keyword results
 * for more precise final ranking.
 *
 * Intentionally simple and explainable — no NLP library required.
 */

import type { ListingCondition } from "@/types";

export interface ExtractedFilters {
  maxPrice?: number;
  minPrice?: number;
  condition?: ListingCondition;
  categoryHint?: string;  // slug hint, not enforced — used to boost ranking
}

// Price patterns:  "under 800", "below ₹1500", "less than 2000", "under rs 500"
const PRICE_UNDER_RE = /(?:under|below|less\s+than|<|upto|up\s+to)\s*(?:rs\.?|₹|inr)?\s*(\d[\d,]*)/i;
const PRICE_ABOVE_RE = /(?:above|over|more\s+than|>|atleast|at\s+least)\s*(?:rs\.?|₹|inr)?\s*(\d[\d,]*)/i;
// "₹500", "rs 800" standalone
const PRICE_STANDALONE_RE = /(?:rs\.?|₹|inr)\s*(\d[\d,]+)/i;

// Condition keywords
const CONDITION_MAP: Record<string, ListingCondition> = {
  "brand new":  "New",
  "brand-new":  "New",
  "new":        "New",
  "unused":     "New",
  "like new":   "Like New",
  "almost new": "Like New",
  "mint":       "Like New",
  "good":       "Good",
  "used":       "Good",
  "second hand":"Good",
  "secondhand": "Good",
  "second-hand":"Good",
  "fair":       "Fair",
  "worn":       "Fair",
  "old":        "Fair",
  "poor":       "Poor",
  "damaged":    "Poor",
  "broken":     "Poor",
};

// Category keyword hints (maps common words → category slugs)
const CATEGORY_HINTS: Record<string, string> = {
  "book":        "books",
  "textbook":    "books",
  "novel":       "books",
  "calculator":  "calculators",
  "casio":       "calculators",
  "laptop":      "laptops",
  "macbook":     "laptops",
  "phone":       "mobile-phones",
  "mobile":      "mobile-phones",
  "smartphone":  "mobile-phones",
  "cycle":       "cycles",
  "bicycle":     "cycles",
  "bike":        "cycles",
  "chair":       "furniture",
  "table":       "furniture",
  "desk":        "furniture",
  "headphone":   "electronics",
  "keyboard":    "electronics",
  "mouse":       "electronics",
  "speaker":     "electronics",
  "arduino":     "lab-equipment",
  "breadboard":  "lab-equipment",
  "multimeter":  "lab-equipment",
  "lab":         "lab-equipment",
  "hostel":      "hostel-items",
  "kettle":      "hostel-items",
  "fan":         "hostel-items",
};

function parsePrice(str: string): number {
  return parseInt(str.replace(/,/g, ""), 10);
}

export function extractFiltersFromQuery(query: string): ExtractedFilters {
  const q = query.toLowerCase();
  const result: ExtractedFilters = {};

  // ── Price extraction ──
  const underMatch = q.match(PRICE_UNDER_RE);
  if (underMatch) {
    result.maxPrice = parsePrice(underMatch[1]);
  }

  const aboveMatch = q.match(PRICE_ABOVE_RE);
  if (aboveMatch) {
    result.minPrice = parsePrice(aboveMatch[1]);
  }

  // "free" keyword
  if (/\bfree\b/.test(q)) {
    result.maxPrice = 0;
  }

  // Standalone price hint (₹800) — treat as max if no other price found
  if (!result.maxPrice && !result.minPrice) {
    const standaloneMatch = q.match(PRICE_STANDALONE_RE);
    if (standaloneMatch) {
      result.maxPrice = parsePrice(standaloneMatch[1]);
    }
  }

  // ── Condition extraction ──
  // Try multi-word first, then single-word
  const sortedConditions = Object.keys(CONDITION_MAP).sort((a, b) => b.length - a.length);
  for (const keyword of sortedConditions) {
    if (q.includes(keyword)) {
      result.condition = CONDITION_MAP[keyword];
      break;
    }
  }

  // ── Category hint extraction ──
  for (const [keyword, slug] of Object.entries(CATEGORY_HINTS)) {
    if (q.includes(keyword)) {
      result.categoryHint = slug;
      break;
    }
  }

  return result;
}
