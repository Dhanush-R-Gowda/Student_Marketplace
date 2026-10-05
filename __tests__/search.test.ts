/**
 * Search system unit tests.
 * Tests filter extraction, ranking logic, and scoring — no DB required.
 */

import { describe, it, expect } from "vitest";
import { extractFiltersFromQuery } from "@/lib/search/filters";
import { mergeAndRank, WEIGHTS } from "@/lib/search/ranking";
import type { KeywordSearchRow } from "@/lib/search/keyword";
import type { SemanticSearchRow } from "@/lib/search/semantic";

// ---------------------------------------------------------------------------
// Filter extraction tests
// ---------------------------------------------------------------------------
describe("extractFiltersFromQuery", () => {
  it("extracts maxPrice from 'under ₹800'", () => {
    const r = extractFiltersFromQuery("calculator under ₹800");
    expect(r.maxPrice).toBe(800);
  });

  it("extracts maxPrice from 'below 30000'", () => {
    const r = extractFiltersFromQuery("laptop below 30000");
    expect(r.maxPrice).toBe(30000);
  });

  it("extracts maxPrice from 'less than 500'", () => {
    const r = extractFiltersFromQuery("book less than 500");
    expect(r.maxPrice).toBe(500);
  });

  it("extracts minPrice from 'above ₹1000'", () => {
    const r = extractFiltersFromQuery("laptop above ₹1000");
    expect(r.minPrice).toBe(1000);
  });

  it("extracts 'used' condition", () => {
    const r = extractFiltersFromQuery("used laptop for coding");
    expect(r.condition).toBe("Good");
  });

  it("extracts 'new' condition", () => {
    const r = extractFiltersFromQuery("brand new calculator");
    expect(r.condition).toBe("New");
  });

  it("extracts category hint from 'calculator'", () => {
    const r = extractFiltersFromQuery("scientific calculator for exams");
    expect(r.categoryHint).toBe("calculators");
  });

  it("extracts category hint from 'laptop'", () => {
    const r = extractFiltersFromQuery("laptop for coding under 30000");
    expect(r.categoryHint).toBe("laptops");
  });

  it("extracts category hint from 'cycle'", () => {
    const r = extractFiltersFromQuery("good condition cycle near campus");
    expect(r.categoryHint).toBe("cycles");
  });

  it("returns empty object for unrelated query", () => {
    const r = extractFiltersFromQuery("something without hints");
    expect(r.maxPrice).toBeUndefined();
    expect(r.condition).toBeUndefined();
    expect(r.categoryHint).toBeUndefined();
  });

  it("handles free keyword", () => {
    const r = extractFiltersFromQuery("free textbooks");
    expect(r.maxPrice).toBe(0);
  });

  it("handles combined query", () => {
    const r = extractFiltersFromQuery("cheap scientific calculator for engineering exams under ₹800");
    expect(r.maxPrice).toBe(800);
    expect(r.categoryHint).toBe("calculators");
  });
});

// ---------------------------------------------------------------------------
// Ranking / scoring tests
// ---------------------------------------------------------------------------
describe("Hybrid ranking weights", () => {
  it("weights sum to exactly 1.0", () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it("semantic weight is the largest", () => {
    const values = Object.values(WEIGHTS);
    expect(WEIGHTS.semantic).toBe(Math.max(...values));
  });

  it("keyword weight is second largest", () => {
    const sorted = Object.entries(WEIGHTS).sort(([, a], [, b]) => b - a);
    expect(sorted[1][0]).toBe("keyword");
  });
});

describe("mergeAndRank", () => {
  const now = new Date().toISOString();

  function makeKeywordRow(id: string, kwRank: number): KeywordSearchRow {
    return {
      id, seller_id: "s1", category_id: 1,
      title: `Listing ${id}`, description: "desc",
      price: 500, condition: "Good", location: "Campus",
      status: "Available", created_at: now, updated_at: now,
      keyword_rank: kwRank, relevance_score: 0,
    } as unknown as KeywordSearchRow;
  }

  function makeSemanticRow(id: string, semScore: number): SemanticSearchRow {
    return {
      id, seller_id: "s1", category_id: 1,
      title: `Listing ${id}`, description: "desc",
      price: 500, condition: "Good", location: "Campus",
      status: "Available", created_at: now, updated_at: now,
      semantic_score: semScore,
    } as unknown as SemanticSearchRow;
  }

  it("deduplicates listings that appear in both results", () => {
    const kw = [makeKeywordRow("A", 0.8), makeKeywordRow("B", 0.5)];
    const sm = [makeSemanticRow("A", 0.9), makeSemanticRow("C", 0.7)];
    const ranked = mergeAndRank(kw, sm);
    const ids = ranked.map(r => r.id);
    // A appears only once
    expect(ids.filter(id => id === "A").length).toBe(1);
    // Total unique: A, B, C
    expect(ranked.length).toBe(3);
  });

  it("ranks high semantic + high keyword result first", () => {
    const kw = [makeKeywordRow("low", 0.1), makeKeywordRow("high", 0.9)];
    const sm = [makeSemanticRow("low", 0.2), makeSemanticRow("high", 0.95)];
    const ranked = mergeAndRank(kw, sm);
    expect(ranked[0].id).toBe("high");
  });

  it("assigns Best Match label to high-scoring results", () => {
    const kw = [makeKeywordRow("A", 1.0)];
    const sm = [makeSemanticRow("A", 1.0)];
    const ranked = mergeAndRank(kw, sm);
    expect(ranked[0].match_label).toBe("Best Match");
  });

  it("assigns no label when only keyword results exist", () => {
    const kw = [makeKeywordRow("A", 0.9)];
    const ranked = mergeAndRank(kw, []);
    expect(ranked[0].match_label).toBe("");
  });

  it("applies price context — penalises over-budget listing", () => {
    const kw = [makeKeywordRow("cheap", 0.8), makeKeywordRow("expensive", 0.8)];
    (kw[0] as unknown as { price: number }).price = 400;
    (kw[1] as unknown as { price: number }).price = 2000;
    const sm = [makeSemanticRow("cheap", 0.8), makeSemanticRow("expensive", 0.8)];

    const ranked = mergeAndRank(kw, sm, { maxPrice: 500 });
    const cheapIdx     = ranked.findIndex(r => r.id === "cheap");
    const expensiveIdx = ranked.findIndex(r => r.id === "expensive");
    expect(cheapIdx).toBeLessThan(expensiveIdx);
  });
});
