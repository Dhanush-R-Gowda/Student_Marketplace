"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import type { Listing, Category } from "@/types";

interface BrowseClientProps {
  listings: Listing[];
  categories: Category[];
  total: number;
  page: number;
  totalPages: number;
  currentFilters: {
    category?: string;
    condition?: string;
    minPrice?: string;
    maxPrice?: string;
    location?: string;
    sortBy?: string;
  };
}

const CONDITIONS = ["New", "Like New", "Good", "Fair", "Poor"] as const;
const SORT_OPTIONS = [
  { value: "newest",     label: "Newest first" },
  { value: "price_asc",  label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "oldest",     label: "Oldest first" },
];

export function BrowseClient({
  listings,
  categories,
  total,
  page,
  totalPages,
  currentFilters,
}: BrowseClientProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Local filter state, initialised from URL
  const [filters, setFilters] = useState({
    category:  currentFilters.category  ?? "",
    condition: currentFilters.condition ?? "",
    minPrice:  currentFilters.minPrice  ?? "",
    maxPrice:  currentFilters.maxPrice  ?? "",
    location:  currentFilters.location  ?? "",
    sortBy:    currentFilters.sortBy    ?? "newest",
  });

  function navigate(overrides: Partial<typeof filters> & { page?: number }) {
    const merged = { ...filters, ...overrides };
    const params = new URLSearchParams();
    if (merged.category)  params.set("category",  merged.category);
    if (merged.condition) params.set("condition", merged.condition);
    if (merged.minPrice)  params.set("minPrice",  merged.minPrice);
    if (merged.maxPrice)  params.set("maxPrice",  merged.maxPrice);
    if (merged.location)  params.set("location",  merged.location);
    if (merged.sortBy && merged.sortBy !== "newest") params.set("sortBy", merged.sortBy);
    if (overrides.page && overrides.page > 1) params.set("page", String(overrides.page));
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyFilters() {
    navigate({ page: 1 });
    setFiltersOpen(false);
  }

  function clearFilters() {
    setFilters({ category: "", condition: "", minPrice: "", maxPrice: "", location: "", sortBy: "newest" });
    router.push(pathname);
  }

  const hasActiveFilters = !!(
    filters.category || filters.condition || filters.minPrice ||
    filters.maxPrice || filters.location
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Browse Listings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {total > 0
              ? `${total} item${total !== 1 ? "s" : ""} available`
              : "No listings available"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort */}
          <select
            value={filters.sortBy}
            onChange={e => {
              setFilters(p => ({ ...p, sortBy: e.target.value }));
              navigate({ sortBy: e.target.value, page: 1 });
            }}
            className="h-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Filter toggle (mobile) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                !
              </span>
            )}
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-8">
        {/* Filter sidebar — always visible on lg, toggled on mobile */}
        <aside
          className={`${
            filtersOpen ? "block" : "hidden"
          } lg:block w-full lg:w-56 shrink-0`}
        >
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-5 sticky top-24">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Filters
              </h2>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Category
              </label>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => setFilters(p => ({ ...p, category: "" }))}
                  className={`block w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                    !filters.category
                      ? "bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-900/30 dark:text-indigo-300"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  All categories
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setFilters(p => ({ ...p, category: cat.slug }))}
                    className={`block w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                      filters.category === cat.slug
                        ? "bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-900/30 dark:text-indigo-300"
                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Condition */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Condition
              </label>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => setFilters(p => ({ ...p, condition: "" }))}
                  className={`block w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                    !filters.condition ? "bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-900/30" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  Any condition
                </button>
                {CONDITIONS.map(c => (
                  <button
                    key={c}
                    onClick={() => setFilters(p => ({ ...p, condition: c }))}
                    className={`block w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                      filters.condition === c ? "bg-indigo-50 text-indigo-700 font-medium dark:bg-indigo-900/30" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Price range (₹)
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={e => setFilters(p => ({ ...p, minPrice: e.target.value }))}
                  min={0}
                  className="w-full h-8 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={e => setFilters(p => ({ ...p, maxPrice: e.target.value }))}
                  min={0}
                  className="w-full h-8 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. Hostel Block A"
                value={filters.location}
                onChange={e => setFilters(p => ({ ...p, location: e.target.value }))}
                className="mt-2 w-full h-8 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <Button fullWidth onClick={applyFilters}>
              Apply filters
            </Button>
          </div>
        </aside>

        {/* Listings grid */}
        <div className="flex-1 min-w-0">
          <ListingGrid
            listings={listings}
            emptyTitle="No listings match your filters"
            emptyDescription="Try removing some filters or browse all categories."
            emptyAction={
              <button
                onClick={clearFilters}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Clear filters
              </button>
            }
          />

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={p => navigate({ page: p })}
          />
        </div>
      </div>
    </div>
  );
}
