import Link from "next/link";
import { Search, Tag, ArrowRight, TrendingUp } from "lucide-react";
import { query } from "@/lib/db";
import { getAllCategories } from "@/lib/db/queries/categories";
import { ListingCard } from "@/components/listing/ListingCard";
import type { Listing, Category } from "@/types";

export const dynamic = "force-dynamic";

const CATEGORY_ICONS: Record<string, string> = {
  "books":            "📚",
  "calculators":      "🔢",
  "electronics":      "⚡",
  "laptops":          "💻",
  "mobile-phones":    "📱",
  "lab-equipment":    "🔬",
  "hostel-items":     "🏠",
  "furniture":        "🪑",
  "cycles":           "🚲",
  "clothing":         "👕",
  "academic-supplies":"✏️",
  "other":            "📦",
};

async function getFeaturedListings(): Promise<Listing[]> {
  return query<Listing>(`
    SELECT
      l.id, l.seller_id, l.category_id, l.title, l.description,
      l.price, l.condition, l.location, l.status,
      l.created_at, l.updated_at,
      u.name AS seller_name,
      c.name AS category_name,
      c.slug AS category_slug,
      (
        SELECT image_url FROM listing_images li
        WHERE li.listing_id = l.id
        ORDER BY li.display_order ASC LIMIT 1
      ) AS primary_image
    FROM listings l
    INNER JOIN users      u ON l.seller_id   = u.id
    INNER JOIN categories c ON l.category_id = c.id
    WHERE l.status = 'Available'
    ORDER BY l.created_at DESC
    LIMIT 8
  `);
}

export default async function HomePage() {
  let listings: Listing[] = [];
  let categories: Category[] = [];

  try {
    [listings, categories] = await Promise.all([
      getFeaturedListings(),
      getAllCategories(),
    ]);
  } catch {
    // DB not configured yet — show static hero only
  }

  const topCategories = categories.slice(0, 8);

  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300">
            <Tag className="h-3.5 w-3.5" />
            Student Marketplace — Buy &amp; Sell on Campus
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            Find what you need.{" "}
            <span className="text-indigo-600">Sell what you don&apos;t.</span>
          </h1>

          <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            A smarter second-hand marketplace built for students. Search naturally,
            discover relevant listings, and trade safely with fellow students.
          </p>

          {/* Search box */}
          <form
            action="/search"
            method="GET"
            className="mt-10 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                name="q"
                type="text"
                placeholder='Try "calculator for engineering exams"'
                className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              className="h-12 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shrink-0"
            >
              Search
            </button>
          </form>

          {/* Quick examples */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {[
              "used laptop",
              "scientific calculator",
              "engineering textbooks",
              "cycle in good condition",
            ].map((example) => (
              <Link
                key={example}
                href={`/search?q=${encodeURIComponent(example)}`}
                className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300"
              >
                {example}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category shortcuts ── */}
      {topCategories.length > 0 && (
        <section className="px-4 py-12 sm:px-6 lg:px-8 bg-white dark:bg-slate-900">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Browse by category
              </h2>
              <Link
                href="/browse"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
              {topCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/browse?category=${cat.slug}`}
                  className="flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-all hover:bg-indigo-50 hover:scale-105 dark:hover:bg-indigo-900/20 group"
                >
                  <span className="text-2xl" role="img" aria-label={cat.name}>
                    {CATEGORY_ICONS[cat.slug] ?? "📦"}
                  </span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 leading-tight">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Recently added listings ── */}
      {listings.length > 0 && (
        <section className="px-4 py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Recently listed
                </h2>
              </div>
              <Link
                href="/browse"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Browse all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-indigo-600">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-white">Ready to sell something?</h2>
          <p className="mt-4 text-indigo-100">
            List your item in minutes. Reach students across your campus.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/listings/new"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Tag className="h-4 w-4" />
              Sell an Item
            </Link>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-400 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Browse Listings
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
