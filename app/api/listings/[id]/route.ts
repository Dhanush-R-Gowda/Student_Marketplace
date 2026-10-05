import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/session";
import { UpdateListingSchema } from "@/lib/validation/schemas";
import {
  getListingById,
  getListingImages,
  updateListing,
  removeListing,
} from "@/lib/db/queries/listings";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/listings/[id]
// Public — returns listing with images and seller info.
// ---------------------------------------------------------------------------
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const listing = await getListingById(id);

    if (!listing) {
      return NextResponse.json(
        { success: false, error: "Listing not found." },
        { status: 404 }
      );
    }

    const images = await getListingImages(id);
    return NextResponse.json({ success: true, data: { ...listing, images } });
  } catch (err) {
    console.error("[GET /api/listings/[id]]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch listing." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/listings/[id]
// Update a listing. Only the seller can edit their own listing.
// ---------------------------------------------------------------------------
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const body = await request.json();
    const parsed = UpdateListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    // Check listing exists
    const existing = await getListingById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Listing not found." },
        { status: 404 }
      );
    }

    // Authorization: only seller or admin can edit
    if (existing.seller_id !== session.id && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "You are not allowed to edit this listing." },
        { status: 403 }
      );
    }

    // Sold listings cannot be re-edited (status change only allowed if admin)
    if (existing.status === "Sold" && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Sold listings cannot be edited." },
        { status: 409 }
      );
    }

    const updated = await updateListing(id, session.id, parsed.data);
    return NextResponse.json({
      success: true,
      data: updated,
      message: "Listing updated.",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("[PUT /api/listings/[id]]", err);
    return NextResponse.json(
      { success: false, error: "Failed to update listing." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/listings/[id]
// Soft-delete: marks listing as Removed. Only seller or admin can do this.
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const existing = await getListingById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Listing not found." },
        { status: 404 }
      );
    }

    if (existing.seller_id !== session.id && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "You are not allowed to remove this listing." },
        { status: 403 }
      );
    }

    if (existing.status === "Sold") {
      return NextResponse.json(
        { success: false, error: "Sold listings cannot be removed." },
        { status: 409 }
      );
    }

    await removeListing(id, session.id);
    return NextResponse.json({
      success: true,
      message: "Listing removed successfully.",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("[DELETE /api/listings/[id]]", err);
    return NextResponse.json(
      { success: false, error: "Failed to remove listing." },
      { status: 500 }
    );
  }
}
