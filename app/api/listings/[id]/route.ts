import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/session";
import { UpdateListingSchema } from "@/lib/validation/schemas";
import {
  getListingById,
  getListingImages,
  updateListing,
  adminUpdateListing,
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
// Update a listing.
//
// Seller path  — only the listing's own seller may edit all fields.
//                updateListing() enforces "WHERE id = $1 AND seller_id = $2".
//
// Admin path   — an admin may change listing status only (not seller-owned
//                content fields).  adminUpdateListing() uses "WHERE id = $1"
//                with no seller constraint so the admin's session.id does not
//                incorrectly replace the seller_id guard and match zero rows.
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

    // Check listing exists before authorisation so 404 beats 403.
    const existing = await getListingById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Listing not found." },
        { status: 404 }
      );
    }

    // Authorization: only seller or admin can edit.
    if (existing.seller_id !== session.id && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "You are not allowed to edit this listing." },
        { status: 403 }
      );
    }

    // ── Admin path ────────────────────────────────────────────────────────
    // Admins may only change status (they must not overwrite seller content).
    if (session.role === "admin") {
      const { status } = parsed.data;
      if (!status) {
        return NextResponse.json(
          { success: false, error: "Admins may only update listing status." },
          { status: 422 }
        );
      }
      // adminUpdateListing targets listing by its own ID — no seller_id in WHERE.
      const updated = await adminUpdateListing(id, { status });
      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Listing not found." },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: updated,
        message: "Listing updated.",
      });
    }

    // ── Seller path ───────────────────────────────────────────────────────
    // Sold listings cannot be re-edited by the seller.
    if (existing.status === "Sold") {
      return NextResponse.json(
        { success: false, error: "Sold listings cannot be edited." },
        { status: 409 }
      );
    }

    // updateListing enforces "WHERE id = $1 AND seller_id = $2".
    const updated = await updateListing(id, session.id, parsed.data);
    if (!updated) {
      // Should not happen (we already confirmed existence and ownership above),
      // but guard against any race condition.
      return NextResponse.json(
        { success: false, error: "Listing not found or no longer owned by you." },
        { status: 404 }
      );
    }
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
