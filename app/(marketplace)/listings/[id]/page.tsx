import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getListingById, getListingImages } from "@/lib/db/queries/listings";
import { getSession } from "@/lib/auth/session";
import { isInWishlist } from "@/lib/db/queries/wishlist";
import { ListingDetailClient } from "./ListingDetailClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) return { title: "Listing not found" };
  return {
    title: listing.title,
    description: listing.description.slice(0, 160),
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;

  const [listing, session] = await Promise.all([
    getListingById(id),
    getSession(),
  ]);

  if (!listing) notFound();

  const images = await getListingImages(id);

  // Check if current user has wishlisted this listing
  let isWishlisted = false;
  if (session?.id) {
    isWishlisted = await isInWishlist(session.id, id);
  }

  const isSeller = session?.id === listing.seller_id;
  const isAdmin  = session?.role === "admin";

  return (
    <ListingDetailClient
      listing={{ ...listing, images }}
      session={session}
      isWishlisted={isWishlisted}
      isSeller={isSeller}
      isAdmin={isAdmin}
    />
  );
}
