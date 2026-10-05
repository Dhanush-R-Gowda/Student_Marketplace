import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { randomBytes } from "crypto";
import { requireAuth, AuthError } from "@/lib/auth/session";
import { addListingImage } from "@/lib/db/queries/listings";
import { getListingById } from "@/lib/db/queries/listings";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const listingId = formData.get("listingId") as string | null;
    const displayOrder = parseInt((formData.get("displayOrder") as string) ?? "0");

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided." },
        { status: 400 }
      );
    }

    if (!listingId) {
      return NextResponse.json(
        { success: false, error: "listingId is required." },
        { status: 400 }
      );
    }

    // Verify the listing belongs to this user
    const listing = await getListingById(listingId);
    if (!listing) {
      return NextResponse.json(
        { success: false, error: "Listing not found." },
        { status: 404 }
      );
    }
    if (listing.seller_id !== session.id && session.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "You cannot upload images for this listing." },
        { status: 403 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Only JPEG, PNG, and WebP images are allowed." },
        { status: 415 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size must be under 5MB." },
        { status: 413 }
      );
    }

    // Generate unique filename
    const ext = extname(file.name) || ".jpg";
    const filename = `${randomBytes(16).toString("hex")}${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const imageUrl = `/uploads/${filename}`;

    // Save to DB
    const image = await addListingImage(listingId, imageUrl, displayOrder);

    return NextResponse.json(
      { success: true, data: image },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("[POST /api/upload]", err);
    return NextResponse.json(
      { success: false, error: "Upload failed." },
      { status: 500 }
    );
  }
}
