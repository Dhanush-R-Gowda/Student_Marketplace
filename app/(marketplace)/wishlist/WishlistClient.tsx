"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, MapPin, Clock, Package } from "lucide-react";
import { StatusBadge, ConditionBadge } from "@/components/ui/Badge";
import { formatDistanceToNow } from "date-fns";
import type { WishlistItem } from "@/types";

export function WishlistClient({ items: initial }: { items: WishlistItem[] }) {
  const [items, setItems] = useState(initial);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  async function handleRemove(listingId: string) {
    setRemoving(prev => new Set(prev).add(listingId));
    try {
      await fetch(`/api/wishlist/${listingId}`, { method: "DELETE" });
      setItems(prev => prev.filter(i => i.listing_id !== listingId));
    } finally {
      setRemoving(prev => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-slate-500 py-12">
        All items removed from wishlist.{" "}
        <Link href="/browse" className="text-indigo-600 hover:underline">
          Browse more
        </Link>
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        // The wishlist query joins listing fields as top-level properties
        const listing = item as unknown as WishlistItem & {
          listing_title: string;
          price: number;
          condition: string;
          location: string;
          status: string;
          category_name: string;
          seller_name: string;
          primary_image: string | null;
          created_at: string;
        };

        const isSold    = listing.status === "Sold";
        const isRemoved = listing.status === "Removed";
        const unavailable = isSold || isRemoved;

        return (
          <div
            key={item.id}
            className={`relative flex flex-col rounded-xl border bg-white dark:bg-slate-800 overflow-hidden transition-all
              ${unavailable ? "opacity-60 border-slate-200" : "border-slate-200 hover:shadow-md hover:-translate-y-0.5"}`}
          >
            {/* Image */}
            <Link href={`/listings/${item.listing_id}`} className="block">
              <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-700 overflow-hidden">
                {listing.primary_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.primary_image}
                    alt={listing.listing_title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-10 w-10 text-slate-300" />
                  </div>
                )}
                {unavailable && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white">
                      {listing.status.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </Link>

            {/* Content */}
            <div className="flex flex-col flex-1 p-4 gap-2">
              <Link href={`/listings/${item.listing_id}`}>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 hover:text-indigo-600">
                  {listing.listing_title}
                </h3>
              </Link>

              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {listing.price === 0 ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  <>₹{Number(listing.price).toLocaleString("en-IN")}</>
                )}
              </p>

              <div className="flex flex-wrap gap-1.5">
                <ConditionBadge condition={listing.condition as "New" | "Like New" | "Good" | "Fair" | "Poor"} />
                {unavailable && <StatusBadge status={listing.status as "Sold" | "Removed" | "Available" | "Reserved"} />}
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{listing.location}</span>
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3 w-3 shrink-0" />
                Saved {formatDistanceToNow(new Date(item.added_at), { addSuffix: true })}
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 flex gap-2">
              {!unavailable && (
                <Link
                  href={`/listings/${item.listing_id}`}
                  className="flex-1 flex items-center justify-center rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  View listing
                </Link>
              )}
              <button
                onClick={() => handleRemove(item.listing_id)}
                disabled={removing.has(item.listing_id)}
                className="flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-slate-500 hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-40"
                aria-label="Remove from wishlist"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
