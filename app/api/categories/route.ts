import { NextResponse } from "next/server";
import { getAllCategories, getAllCategoriesFlat } from "@/lib/db/queries/categories";

// This route always reads from the database — never statically rendered
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const flat = searchParams.get("flat") === "true";

    const categories = flat
      ? await getAllCategoriesFlat()
      : await getAllCategories();

    return NextResponse.json({ success: true, data: categories });
  } catch (err) {
    console.error("[GET /api/categories]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
