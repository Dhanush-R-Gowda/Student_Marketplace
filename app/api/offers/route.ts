import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/session";
import { CreateOfferSchema } from "@/lib/validation/schemas";
import { createOffer, getOffersByBuyer, getOffersByListing } from "@/lib/db/queries/offers";
import { getListingById } from "@/lib/db/queries/listings";

export const dynamic = "force-dynamic";

// GET /api/offers — returns offers for the current user
// ?role=buyer  → offers made by this user
// ?role=seller → offers received on their listings
// ?listingId=  → all offers on a specific listing (seller only)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const role      = searchParams.get("role") ?? "buyer";
    const listingId = searchParams.get("listingId");

    if (listingId) {
      // Seller checking offers on their listing
      const listing = await getListingById(listingId);
      if (!listing) {
        return NextResponse.json({ success: false, error: "Listing not found." }, { status: 404 });
      }
      if (listing.seller_id !== session.id && session.role !== "admin") {
        return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 403 });
      }
      const offers = await getOffersByListing(listingId);
      return NextResponse.json({ success: true, data: offers });
    }

    // Buyer's sent offers
    const offers = await getOffersByBuyer(session.id);
    return NextResponse.json({ success: true, data: offers });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    }
    console.error("[GET /api/offers]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch offers." }, { status: 500 });
  }
}

// POST /api/offers — create a new offer
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body    = await request.json();

    const parsed = CreateOfferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { listing_id, amount, message } = parsed.data;

    // Verify listing exists and is available
    const listing = await getListingById(listing_id);
    if (!listing) {
      return NextResponse.json({ success: false, error: "Listing not found." }, { status: 404 });
    }
    if (listing.status === "Sold" || listing.status === "Removed") {
      return NextResponse.json(
        { success: false, error: `This listing is ${listing.status.toLowerCase()} and no longer accepting offers.` },
        { status: 409 }
      );
    }
    if (listing.seller_id === session.id) {
      return NextResponse.json(
        { success: false, error: "You cannot make an offer on your own listing." },
        { status: 409 }
      );
    }

    // DB trigger T4 also enforces these rules — double protection
    const offer = await createOffer({
      listingId: listing_id,
      buyerId:   session.id,
      amount,
      message,
    });

    return NextResponse.json(
      { success: true, data: offer, message: "Offer submitted successfully." },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    }
    // DB-level constraint violation (trigger T4 or EXCLUDE constraint)
    const pgErr = err as { code?: string; message?: string };
    if (pgErr.code === "check_violation" || pgErr.code === "23P01") {
      return NextResponse.json({ success: false, error: pgErr.message ?? "Offer not allowed." }, { status: 409 });
    }
    // Unique constraint: buyer already has pending offer on this listing
    if (pgErr.code === "23505") {
      return NextResponse.json(
        { success: false, error: "You already have a pending offer on this listing." },
        { status: 409 }
      );
    }
    console.error("[POST /api/offers]", err);
    return NextResponse.json({ success: false, error: "Failed to create offer." }, { status: 500 });
  }
}
