import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/session";
import { getWishlistItems, addToWishlist, isInWishlist } from "@/lib/db/queries/wishlist";
import { getListingById } from "@/lib/db/queries/listings";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET /api/wishlist — returns the current user's wishlist items
export async function GET() {
  try {
    const session = await requireAuth();
    const items   = await getWishlistItems(session.id);
    return NextResponse.json({ success: true, data: items });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    }
    console.error("[GET /api/wishlist]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch wishlist." }, { status: 500 });
  }
}

// POST /api/wishlist — add a listing to wishlist
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body   = await request.json();
    const parsed = z.object({ listingId: z.string().uuid() }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "listingId (UUID) is required." },
        { status: 422 }
      );
    }

    const { listingId } = parsed.data;

    // Verify listing exists
    const listing = await getListingById(listingId);
    if (!listing) {
      return NextResponse.json({ success: false, error: "Listing not found." }, { status: 404 });
    }

    // Check for duplicate
    const already = await isInWishlist(session.id, listingId);
    if (already) {
      return NextResponse.json(
        { success: false, error: "Already in wishlist." },
        { status: 409 }
      );
    }

    await addToWishlist(session.id, listingId);
    return NextResponse.json(
      { success: true, message: "Added to wishlist." },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    }
    console.error("[POST /api/wishlist]", err);
    return NextResponse.json({ success: false, error: "Failed to add to wishlist." }, { status: 500 });
  }
}
