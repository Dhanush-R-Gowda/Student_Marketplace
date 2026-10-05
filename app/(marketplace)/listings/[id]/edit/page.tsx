import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { getListingById } from "@/lib/db/queries/listings";
import { getAllCategoriesFlat } from "@/lib/db/queries/categories";
import { EditListingForm } from "./EditListingForm";

export const metadata: Metadata = { title: "Edit Listing" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditListingPage({ params }: Props) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login");
  }

  const { id } = await params;
  const [listing, categories] = await Promise.all([
    getListingById(id),
    getAllCategoriesFlat(),
  ]);

  if (!listing) notFound();

  // Only seller or admin can edit
  if (listing.seller_id !== session.id && session.role !== "admin") {
    redirect(`/listings/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Listing</h1>
        <p className="mt-1 text-sm text-slate-500">Update your listing details.</p>
      </div>
      <EditListingForm listing={listing} categories={categories} />
    </div>
  );
}
