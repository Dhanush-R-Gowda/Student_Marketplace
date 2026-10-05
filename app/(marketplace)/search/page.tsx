import { Metadata } from "next";
import { getAllCategories } from "@/lib/db/queries/categories";
import { hybridSearch } from "@/lib/search/hybrid";
import { isSemanticSearchAvailable } from "@/lib/embeddings/generate";
import { SearchClient } from "./SearchClient";
import type { ListingCondition, ListingStatus } from "@/types";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    condition?: string;
    minPrice?: string;
    maxPrice?: string;
    location?: string;
    sortBy?: string;
    page?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;

  const page  = Math.max(1, parseInt(sp.page ?? "1"));
  const limit = 20;

  const [results, categories] = await Promise.all([
    hybridSearch({
      q:            sp.q ?? "",
      categorySlug: sp.category,
      minPrice:     sp.minPrice   ? parseFloat(sp.minPrice)  : undefined,
      maxPrice:     sp.maxPrice   ? parseFloat(sp.maxPrice)  : undefined,
      condition:    sp.condition  as ListingCondition | undefined,
      location:     sp.location,
      status:       "Available"  as ListingStatus,
      sortBy:       (sp.sortBy ?? (sp.q ? "relevance" : "newest")) as
                    "relevance" | "newest" | "price_asc" | "price_desc",
      page,
      limit,
    }),
    getAllCategories(),
  ]);

  return (
    <SearchClient
      initialResults={results}
      categories={categories}
      semanticAvailable={isSemanticSearchAvailable()}
      initialParams={sp}
    />
  );
}
