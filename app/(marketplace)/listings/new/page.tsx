import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { getAllCategoriesFlat } from "@/lib/db/queries/categories";
import { CreateListingForm } from "./CreateListingForm";

export const metadata: Metadata = { title: "Create Listing" };
export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  let _session;
  try {
    _session = await requireAuth();
  } catch {
    redirect("/login?redirect=/listings/new");
  }

  const categories = await getAllCategoriesFlat();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Create a Listing
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Fill in the details below. Be accurate — buyers depend on your description.
        </p>
      </div>
      <CreateListingForm categories={categories} />
    </div>
  );
}
