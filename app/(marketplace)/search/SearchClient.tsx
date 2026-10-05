"use client";

import { useState, useCallback, FormEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, SlidersHorizontal, X, Sparkles, Zap } from "lucide-react";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { SearchResponse, Category } from "@/types";

interface SearchClientProps {
  initialResults: SearchResponse;
  categories: Category[];
  semanticAvailable: boolean;
  initialParams: {
    q?: string;
    category?: string;
    condition?: string;
    minPrice?: string;
    maxPrice?: string;
    location?: string;
    sortBy?: string;
  };
}

const CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"];
const SORT_OPTIONS = [
  { value: "relevance",  label: "Most relevant" },
  { value: "newest",     label: "Newest first" },
  { value: "price_asc",  label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export function SearchClient({
  initialResults,
  categories,
  semanticAvailable,
  initialParams,
}: SearchClientProps) {
  const router   = useRouter();
  const pathname = usePathname();

  const [query,   setQuery]   = useState(initialParams.q ?? "");
  const [results, setResults] = useState<SearchResponse>(initialResults);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState({
    category:  initialParams.category  ?? "",
    condition: initialParams.condition ?? "",
    minPrice:  initialParams.minPrice  ?? "",
    maxPrice:  initialParams.maxPrice  ?? "",
    location:  initialParams.location  ?? "",
    sortBy:    initialParams.sortBy    ?? (initialParams.q ? "relevance" : "newest"),
  });

  const hasFilters = !!(filters.category || filters.condition || filters.minPrice || filters.maxPrice || filters.location);

  // Build URL params from current state
  function buildParams(overrides: Partial<typeof filters & { q?: string; page?: number }> = {}) {
    const merged = { q: query, ...filters, ...overrides };
    const p = new URLSearchParams();
    if (merged.q)         p.set("q",        merged.q);
    if (merged.category)  p.set("category", merged.category);
    if (merged.condition) p.set("condition",merged.condition);
    if (merged.minPrice)  p.set("minPrice", merged.minPrice);
    if (merged.maxPrice)  p.set("maxPrice", merged.maxPrice);
    if (merged.location)  p.set("location", merged.location);
    if (merged.sortBy && merged.sortBy !== "newest") p.set("sortBy", merged.sortBy);
    if (overrides.page && overrides.page > 1) p.set("page", String(overrides.page));
    return p.toString();
  }

  // Client-side search (updates URL + fetches results without full page reload)
  async function doSearch(overrides: Partial<typeof filters & { q?: string; page?: number }> = {}) {
    setLoading(true);
    const params = buildParams(overrides);
    router.push(`${pathname}?${params}`, { scroll: false });

    try {
      const res  = await fetch(`/api/search?${params}`);
      const json = await res.json();
      if (json.success) setResults(json.data);
    } catch {
      // Keep old results on error
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const newSortBy = query ? "relevance" : "newest";
    setFilters(p => ({ ...p, sortBy: newSortBy }));
    doSearch({ q: query, sortBy: newSortBy, page: 1 });
  }

  function applyFilters() {
    doSearch({ page: 1 });
    setFiltersOpen(false);
  }

  function clearAll() {
    setQuery("");
    const reset = { category: "", condition: "", minPrice: "", maxPrice: "", location: "", sortBy: "newest" };
    setFilters(reset);
    doSearch({ q: "", ...reset, page: 1 });
  }

  const isHybrid  = results.searchMode === "hybrid";
  const isKeyword = results.searchMode === "keyword";
  const showRelevance = results.searchMode !== "filter-only";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

      {/* ── Search bar ── */}
      <form onSubmit={handleSearchSubmit} className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Try "calculator for engineering exams under ₹800"'
            className="w-full h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white dark:placeholder:text-slate-400"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); doSearch({ q: "", sortBy: "newest" }); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" size="lg" loading={loading}>
          Search
        </Button>
      </form>

      {/* ── Search mode badge + result count ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-slate-500">
            {loading ? (
              <span className="flex items-center gap-2"><Spinner size="sm" /> Searching…</span>
            ) : (
              <>
                <span className="font-semibold text-slate-900 dark:text-white">{results.total}</span>
                {" "}result{results.total !== 1 ? "s" : ""}
                {query && <> for <em className="not-italic font-medium text-slate-700 dark:text-slate-300">&ldquo;{query}&rdquo;</em></>}
              </>
            )}
          </p>

          {/* Search mode indicator */}
          {isHybrid && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
              <Sparkles className="h-3 w-3" />
              AI-powered search
            </span>
          )}
          {isKeyword && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Zap className="h-3 w-3" />
              Keyword search
            </span>
          )}
          {!semanticAvailable && query && (
            <span className="text-xs text-slate-400">
              (Semantic search inactive — OPENAI_API_KEY not set)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <select
            value={filters.sortBy}
            onChange={e => {
              const s = e.target.value;
              setFilters(p => ({ ...p, sortBy: s }));
              doSearch({ sortBy: s, page: 1 });
            }}
            className="h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <Button variant="outline" size="sm" onClick={() => setFiltersOpen(!filtersOpen)} className="lg:hidden">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>

          {(hasFilters || query) && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="h-4 w-4" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-8">
        {/* ── Filter sidebar ── */}
        <aside className={`${filtersOpen ? "block" : "hidden"} lg:block w-56 shrink-0`}>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-5 sticky top-24">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Filters</h2>
              {hasFilters && (
                <button onClick={() => {
                  const reset = { category: "", condition: "", minPrice: "", maxPrice: "", location: "" };
                  setFilters(p => ({ ...p, ...reset }));
                  doSearch({ ...reset, page: 1 });
                }} className="text-xs text-indigo-600 hover:underline">Clear</button>
              )}
            </div>

            {/* Category */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Category</p>
              <div className="space-y-0.5 max-h-52 overflow-y-auto">
                <FilterBtn active={!filters.category} onClick={() => { setFilters(p => ({ ...p, category: "" })); doSearch({ category: "", page: 1 }); }}>All</FilterBtn>
                {categories.map(c => (
                  <FilterBtn key={c.id} active={filters.category === c.slug} onClick={() => { setFilters(p => ({ ...p, category: c.slug })); doSearch({ category: c.slug, page: 1 }); }}>
                    {c.name}
                  </FilterBtn>
                ))}
              </div>
            </div>

            {/* Condition */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Condition</p>
              <div className="space-y-0.5">
                <FilterBtn active={!filters.condition} onClick={() => { setFilters(p => ({ ...p, condition: "" })); doSearch({ condition: "", page: 1 }); }}>Any</FilterBtn>
                {CONDITIONS.map(c => (
                  <FilterBtn key={c} active={filters.condition === c} onClick={() => { setFilters(p => ({ ...p, condition: c })); doSearch({ condition: c, page: 1 }); }}>
                    {c}
                  </FilterBtn>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Price (₹)</p>
              <div className="flex gap-2">
                <input type="number" placeholder="Min" min={0} value={filters.minPrice}
                  onChange={e => setFilters(p => ({ ...p, minPrice: e.target.value }))}
                  className="w-full h-8 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                <input type="number" placeholder="Max" min={0} value={filters.maxPrice}
                  onChange={e => setFilters(p => ({ ...p, maxPrice: e.target.value }))}
                  className="w-full h-8 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Location */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Location</p>
              <input type="text" placeholder="e.g. Hostel Block A" value={filters.location}
                onChange={e => setFilters(p => ({ ...p, location: e.target.value }))}
                className="w-full h-8 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <Button fullWidth size="sm" onClick={applyFilters}>Apply</Button>
          </div>
        </aside>

        {/* ── Results ── */}
        <div className="flex-1 min-w-0">
          {/* Extracted filter hints */}
          {query && !loading && results.searchMode !== "filter-only" && (
            <ExtractedHints query={query} />
          )}

          <ListingGrid
            listings={results.listings}
            loading={loading}
            showRelevance={showRelevance}
            emptyTitle={query ? `No results for "${query}"` : "No listings found"}
            emptyDescription={query
              ? "Try different keywords, or remove some filters."
              : "Try adjusting your filters."}
            emptyAction={
              (hasFilters || query) ? (
                <button onClick={clearAll} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                  Clear search
                </button>
              ) : undefined
            }
          />

          <Pagination
            page={results.page}
            totalPages={results.totalPages}
            onPageChange={p => doSearch({ page: p })}
          />
        </div>
      </div>
    </div>
  );
}

// ── Small helper components ────────────────────────────────────────────────

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`block w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
      active
        ? "bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-900/30 dark:text-indigo-300"
        : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
    }`}>
      {children}
    </button>
  );
}

function ExtractedHints({ query }: { query: string }) {
  // Import at module level would create circular deps; import dynamically here
  const { extractFiltersFromQuery } = require("@/lib/search/filters");
  const extracted = extractFiltersFromQuery(query);

  const hints: string[] = [];
  if (extracted.maxPrice !== undefined) hints.push(`under ₹${extracted.maxPrice.toLocaleString()}`);
  if (extracted.minPrice !== undefined) hints.push(`above ₹${extracted.minPrice.toLocaleString()}`);
  if (extracted.condition)             hints.push(extracted.condition);
  if (extracted.categoryHint)         hints.push(extracted.categoryHint.replace("-", " "));

  if (hints.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span>Auto-detected:</span>
      {hints.map(h => (
        <span key={h} className="rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 font-medium">
          {h}
        </span>
      ))}
    </div>
  );
}
