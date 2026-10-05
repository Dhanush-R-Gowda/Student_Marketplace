import { NextRequest, NextResponse } from "next/server";
import { SearchQuerySchema } from "@/lib/validation/schemas";
import { hybridSearch } from "@/lib/search/hybrid";
import { isSemanticSearchAvailable } from "@/lib/embeddings/generate";
import type { ListingCondition, ListingStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = Object.fromEntries(searchParams.entries());

    const parsed = SearchQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid search parameters", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const {
      q, category, minPrice, maxPrice,
      condition, location, status,
      sortBy, page, limit,
    } = parsed.data;

    const results = await hybridSearch({
      q:            q || "",
      categorySlug: category,
      minPrice,
      maxPrice,
      condition:    condition as ListingCondition | undefined,
      location,
      status:       (status as ListingStatus) ?? "Available",
      sortBy:       sortBy as "relevance" | "newest" | "price_asc" | "price_desc",
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...results,
        semanticAvailable: isSemanticSearchAvailable(),
      },
    });
  } catch (err) {
    console.error("[GET /api/search]", err);
    return NextResponse.json(
      { success: false, error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}
