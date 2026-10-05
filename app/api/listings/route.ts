import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/session";
import { CreateListingSchema } from "@/lib/validation/schemas";
import { createListing } from "@/lib/db/queries/listings";
import { query } from "@/lib/db";
import type { Listing } from "@/types";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/listings
// Returns paginated listings from all_listings_view with optional filters.
// Used by the browse page.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const categorySlug = searchParams.get("category");
    const status       = searchParams.get("status") ?? "Available";
    const sellerId     = searchParams.get("sellerId");
    const condition    = searchParams.get("condition");
    const minPrice     = searchParams.get("minPrice");
    const maxPrice     = searchParams.get("maxPrice");
    const location     = searchParams.get("location");
    const sortBy       = searchParams.get("sortBy") ?? "newest";
    const page         = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit        = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
    const offset       = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = [];
    const values: unknown[]    = [];
    let idx = 1;

    if (status !== "all") {
      conditions.push(`l.status = $${idx++}`);
      values.push(status);
    }
    if (categorySlug) {
      conditions.push(`(c.slug = $${idx} OR pc.slug = $${idx})`);
      values.push(categorySlug);
      idx++;
    }
    if (sellerId) {
      conditions.push(`l.seller_id = $${idx++}`);
      values.push(sellerId);
    }
    if (condition) {
      conditions.push(`l.condition = $${idx++}`);
      values.push(condition);
    }
    if (minPrice) {
      conditions.push(`l.price >= $${idx++}`);
      values.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      conditions.push(`l.price <= $${idx++}`);
      values.push(parseFloat(maxPrice));
    }
    if (location) {
      conditions.push(`l.location ILIKE $${idx++}`);
      values.push(`%${location}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Sort
    const orderMap: Record<string, string> = {
      newest:     "l.created_at DESC",
      oldest:     "l.created_at ASC",
      price_asc:  "l.price ASC",
      price_desc: "l.price DESC",
    };
    const order = orderMap[sortBy] ?? "l.created_at DESC";

    // Count
    const countSql = `
      SELECT COUNT(*) AS total
      FROM listings l
      INNER JOIN users      u  ON l.seller_id   = u.id
      INNER JOIN categories c  ON l.category_id = c.id
      LEFT  JOIN categories pc ON c.parent_id   = pc.id
      ${where}
    `;
    const countRows = await query<{ total: string }>(countSql, values);
    const total = parseInt(countRows[0]?.total ?? "0");

    // Fetch listings
    const listingSql = `
      SELECT
        l.id, l.seller_id, l.category_id, l.title, l.description,
        l.price, l.condition, l.location, l.status,
        l.created_at, l.updated_at,
        u.name        AS seller_name,
        u.email       AS seller_email,
        c.name        AS category_name,
        c.slug        AS category_slug,
        pc.name       AS parent_category_name,
        (
          SELECT image_url FROM listing_images li
          WHERE li.listing_id = l.id
          ORDER BY li.display_order ASC LIMIT 1
        ) AS primary_image
      FROM listings l
      INNER JOIN users      u  ON l.seller_id   = u.id
      INNER JOIN categories c  ON l.category_id = c.id
      LEFT  JOIN categories pc ON c.parent_id   = pc.id
      ${where}
      ORDER BY ${order}
      LIMIT $${idx++} OFFSET $${idx}
    `;

    const listings = await query<Listing>(listingSql, [...values, limit, offset]);

    return NextResponse.json({
      success: true,
      data: {
        listings,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (err) {
    console.error("[GET /api/listings]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch listings." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/listings
// Create a new listing. Requires authentication.
// Images are handled separately via /api/upload after listing creation.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const parsed = CreateListingSchema.safeParse(body);
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

    const listing = await createListing(session.id, parsed.data);

    return NextResponse.json(
      { success: true, data: listing, message: "Listing created successfully." },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("[POST /api/listings]", err);
    return NextResponse.json(
      { success: false, error: "Failed to create listing." },
      { status: 500 }
    );
  }
}
