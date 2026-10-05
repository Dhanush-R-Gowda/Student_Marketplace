import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/session";
import { CreateReportSchema } from "@/lib/validation/schemas";
import { createReport } from "@/lib/db/queries/reports";
import { getListingById } from "@/lib/db/queries/listings";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const parsed = CreateReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { listing_id, reason, description } = parsed.data;

    // Verify listing exists
    const listing = await getListingById(listing_id);
    if (!listing) {
      return NextResponse.json(
        { success: false, error: "Listing not found." },
        { status: 404 }
      );
    }

    // Seller cannot report their own listing
    if (listing.seller_id === session.id) {
      return NextResponse.json(
        { success: false, error: "You cannot report your own listing." },
        { status: 409 }
      );
    }

    const report = await createReport({
      reporterId: session.id,
      listingId: listing_id,
      reason,
      description,
    });

    return NextResponse.json(
      { success: true, data: report, message: "Report submitted." },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode });
    }
    // Duplicate report
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      return NextResponse.json(
        { success: false, error: "You have already reported this listing." },
        { status: 409 }
      );
    }
    console.error("[POST /api/reports]", err);
    return NextResponse.json({ success: false, error: "Failed to submit report." }, { status: 500 });
  }
}
