import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/session";
import { removeFromWishlist } from "@/lib/db/queries/wishlist";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ listingId: string }> };

// DELETE /api/wishlist/[listingId] — remove from wishlist
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const session   = await requireAuth();
    const { listingId } = await params;

    const removed = await removeFromWishlist(session.id, listingId);
    if (!removed) {
      return NextResponse.json(
        { success: false, error: "Item not found in wishlist." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Removed from wishlist." });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    }
    console.error("[DELETE /api/wishlist/[listingId]]", err);
    return NextResponse.json({ success: false, error: "Failed to remove from wishlist." }, { status: 500 });
  }
}
