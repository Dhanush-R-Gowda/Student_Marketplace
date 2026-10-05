/**
 * POST /api/listings/[id]/embed
 * Generates and stores an embedding vector for a listing.
 * Called automatically after listing creation if OPENAI_API_KEY is set.
 * Can also be called manually to regenerate embeddings.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/session";
import { getListingById, updateListingEmbedding } from "@/lib/db/queries/listings";
import { generateEmbedding, buildListingSearchText } from "@/lib/embeddings/generate";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const listing = await getListingById(id);
    if (!listing) {
      return NextResponse.json({ success: false, error: "Listing not found." }, { status: 404 });
    }

    if (listing.seller_id !== session.id && session.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 403 });
    }

    const text = buildListingSearchText({
      title:         listing.title,
      description:   listing.description,
      category_name: listing.category_name,
      condition:     listing.condition,
      location:      listing.location,
    });

    const embedding = await generateEmbedding(text);

    if (!embedding) {
      return NextResponse.json({
        success: false,
        error: "Embedding generation unavailable. OPENAI_API_KEY not set or API error.",
      }, { status: 503 });
    }

    await updateListingEmbedding(id, embedding);

    return NextResponse.json({
      success: true,
      message: "Embedding generated and stored.",
      dimensions: embedding.length,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    }
    console.error("[POST /api/listings/[id]/embed]", err);
    return NextResponse.json({ success: false, error: "Failed to generate embedding." }, { status: 500 });
  }
}
