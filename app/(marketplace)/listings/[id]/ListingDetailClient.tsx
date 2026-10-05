"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin, Clock, Heart, Flag, Edit3, Trash2,
  MessageSquare, ChevronLeft, ChevronRight, Package,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge, ConditionBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { MakeOfferModal } from "@/components/offer/MakeOfferModal";
import { formatDistanceToNow, format } from "date-fns";
import type { Listing, ListingImage, SessionUser } from "@/types";

interface ListingDetailClientProps {
  listing: Listing & { images: ListingImage[] };
  session: SessionUser | null;
  isWishlisted: boolean;
  isSeller: boolean;
  isAdmin: boolean;
}

export function ListingDetailClient({
  listing,
  session,
  isWishlisted: initialWishlisted,
  isSeller,
  isAdmin,
}: ListingDetailClientProps) {
  const router = useRouter();
  const [currentImage, setCurrentImage] = useState(0);
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);

  const images = listing.images ?? [];
  const isAvailable = listing.status === "Available";
  const isSold = listing.status === "Sold";

  function prevImage() {
    setCurrentImage(i => (i === 0 ? images.length - 1 : i - 1));
  }
  function nextImage() {
    setCurrentImage(i => (i === images.length - 1 ? 0 : i + 1));
  }

  async function toggleWishlist() {
    if (!session) { router.push("/login"); return; }
    setWishlistLoading(true);
    try {
      if (wishlisted) {
        await fetch(`/api/wishlist/${listing.id}`, { method: "DELETE" });
        setWishlisted(false);
      } else {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: listing.id }),
        });
        setWishlisted(true);
      }
    } finally {
      setWishlistLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}`, { method: "DELETE" });
      if (res.ok) router.push("/browse");
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/browse" className="hover:text-indigo-600 transition-colors">
          Browse
        </Link>
        <span>›</span>
        {listing.category_name && (
          <>
            <Link
              href={`/browse?category=${listing.category_slug}`}
              className="hover:text-indigo-600 transition-colors"
            >
              {listing.category_name}
            </Link>
            <span>›</span>
          </>
        )}
        <span className="text-slate-700 dark:text-slate-300 line-clamp-1">
          {listing.title}
        </span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Left: images (3 cols on lg) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Main image */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
            {images.length > 0 ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[currentImage]?.image_url}
                  alt={`${listing.title} — image ${currentImage + 1}`}
                  className="h-full w-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      aria-label="Previous image"
                      className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow hover:bg-white transition"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      aria-label="Next image"
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow hover:bg-white transition"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImage(i)}
                          aria-label={`Go to image ${i + 1}`}
                          className={`h-1.5 rounded-full transition-all ${
                            i === currentImage
                              ? "w-5 bg-white"
                              : "w-1.5 bg-white/60"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Package className="h-16 w-16 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No images provided</p>
                </div>
              </div>
            )}

            {/* Sold/Reserved overlay */}
            {!isAvailable && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
                <span className={`rounded-xl px-6 py-2 text-xl font-bold tracking-widest ${
                  isSold ? "bg-red-600 text-white" : "bg-amber-500 text-white"
                }`}>
                  {listing.status.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setCurrentImage(i)}
                  className={`shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition ${
                    i === currentImage
                      ? "border-indigo-500"
                      : "border-transparent hover:border-slate-300"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.image_url}
                    alt={`Thumbnail ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: details (2 cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Title + price */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                {listing.title}
              </h1>
            </div>

            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {listing.price === 0 ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  <>₹{listing.price.toLocaleString("en-IN")}</>
                )}
              </span>
              <StatusBadge status={listing.status} />
              <ConditionBadge condition={listing.condition} />
            </div>
          </div>

          {/* Location + date */}
          <div className="flex flex-col gap-1.5 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {listing.location}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Listed {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
            </div>
          </div>

          {/* Category */}
          {listing.category_name && (
            <div>
              <Link
                href={`/browse?category=${listing.category_slug}`}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                {listing.category_name}
              </Link>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            {!isSeller && !isAdmin && session && isAvailable && (
              <button
                onClick={() => setShowOfferModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Make an Offer
              </button>
            )}

            {!isSeller && !session && isAvailable && (
              <Link
                href="/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Log in to Make an Offer
              </Link>
            )}

            {isSold && (
              <div className="flex w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 py-3 text-sm font-medium text-slate-500">
                This item has been sold
              </div>
            )}

            {/* Wishlist */}
            {!isSeller && (
              <button
                onClick={toggleWishlist}
                disabled={wishlistLoading || isSold}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                  wishlisted
                    ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
                {wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              </button>
            )}

            {/* Seller actions */}
            {(isSeller || isAdmin) && (
              <div className="flex gap-2">
                <Link
                  href={`/listings/${listing.id}/edit`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Link>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-300 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            )}

            {/* Report button (for non-sellers) */}
            {!isSeller && session && (
              <Link
                href={`/listings/${listing.id}/report`}
                className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                <Flag className="h-3 w-3" />
                Report this listing
              </Link>
            )}
          </div>

          {/* Seller card */}
          <Card className="bg-slate-50 dark:bg-slate-800/50" padding="sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Seller
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold">
                {listing.seller_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {listing.seller_name}
                </p>
                {listing.seller_college && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {listing.seller_college}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Description */}
      <div className="mt-8">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Description
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {listing.description}
          </p>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500 font-medium">Condition</p>
              <p className="text-slate-900 dark:text-white mt-0.5">{listing.condition}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Category</p>
              <p className="text-slate-900 dark:text-white mt-0.5">{listing.category_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Location</p>
              <p className="text-slate-900 dark:text-white mt-0.5">{listing.location}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Listed on</p>
              <p className="text-slate-900 dark:text-white mt-0.5">
                {format(new Date(listing.created_at), "dd MMM yyyy")}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Make Offer Modal */}
      {showOfferModal && (
        <MakeOfferModal
          listingId={listing.id}
          listingTitle={listing.title}
          listingPrice={listing.price}
          onClose={() => setShowOfferModal(false)}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Remove listing?
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              This will mark the listing as removed and it will no longer appear to buyers.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="destructive"
                fullWidth
                loading={deleteLoading}
                onClick={handleDelete}
              >
                Yes, remove it
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
