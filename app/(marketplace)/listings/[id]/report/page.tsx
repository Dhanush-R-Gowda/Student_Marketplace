import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { getListingById } from "@/lib/db/queries/listings";
import { ReportForm } from "./ReportForm";

export const metadata: Metadata = { title: "Report Listing" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ReportListingPage({ params }: Props) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login");
  }

  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  // Seller cannot report their own listing
  if (listing.seller_id === session.id) {
    redirect(`/listings/${id}`);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Report Listing
      </h1>
      <p className="text-sm text-slate-500 mb-8">
        Reporting: <span className="font-medium text-slate-700 dark:text-slate-300">{listing.title}</span>
      </p>
      <ReportForm listingId={id} />
    </div>
  );
}
