import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/session";
import { UpdateOfferSchema } from "@/lib/validation/schemas";
import {
  getOfferById,
  acceptOffer,
  rejectOffer,
  withdrawOffer,
} from "@/lib/db/queries/offers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/offers/[id]
// Body: { status: "Accepted" | "Rejected" | "Withdrawn" }
//
// Accepted → calls accept_offer() stored function (full DB transaction)
// Rejected → seller rejects without accepting another
// Withdrawn → buyer withdraws their own offer
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session  = await requireAuth();
    const { id }   = await params;
    const body     = await request.json();

    const parsed = UpdateOfferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { status } = parsed.data;
    const offer = await getOfferById(id);

    if (!offer) {
      return NextResponse.json({ success: false, error: "Offer not found." }, { status: 404 });
    }

    if (offer.status !== "Pending") {
      return NextResponse.json(
        { success: false, error: `Offer is already ${offer.status.toLowerCase()}.` },
        { status: 409 }
      );
    }

    if (status === "Withdrawn") {
      // Only the buyer can withdraw
      if (offer.buyer_id !== session.id) {
        return NextResponse.json({ success: false, error: "Only the buyer can withdraw an offer." }, { status: 403 });
      }
      await withdrawOffer(id, session.id);
      return NextResponse.json({ success: true, message: "Offer withdrawn." });
    }

    // Accept or Reject: only the seller can do this
    if (offer.seller_id !== session.id && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only the seller can accept or reject offers." },
        { status: 403 }
      );
    }

    if (status === "Accepted") {
      // ────────────────────────────────────────────────────────────────────
      // DBMS CENTERPIECE: accept_offer() stored function
      // This runs inside a database transaction:
      //   BEGIN
      //     SELECT ... FOR UPDATE (lock listing + offer)
      //     UPDATE offers SET status = 'Accepted'
      //     UPDATE offers SET status = 'Rejected' (competing offers)
      //     UPDATE listings SET status = 'Sold'
      //     INSERT INTO transactions (...)
      //     INSERT INTO notifications (...)
      //   COMMIT
      // On any failure: ROLLBACK (no inconsistent state left)
      // ────────────────────────────────────────────────────────────────────
      try {
        const transactionId = await acceptOffer(id, session.id);
        return NextResponse.json({
          success: true,
          data: { transactionId },
          message: "Offer accepted. Listing marked as sold.",
        });
      } catch (err) {
        const pgErr = err as { message?: string; code?: string };
        // Propagate business rule errors as 409
        if (pgErr.code === "no_data_found" || pgErr.code === "check_violation" || pgErr.code === "insufficient_privilege") {
          return NextResponse.json({ success: false, error: pgErr.message ?? "Could not accept offer." }, { status: 409 });
        }
        throw err;
      }
    }

    if (status === "Rejected") {
      await rejectOffer(id, session.id);
      return NextResponse.json({ success: true, message: "Offer rejected." });
    }

    return NextResponse.json({ success: false, error: "Invalid status." }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    }
    console.error("[PATCH /api/offers/[id]]", err);
    return NextResponse.json({ success: false, error: "Failed to update offer." }, { status: 500 });
  }
}
