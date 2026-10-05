import Link from "next/link";
import { MapPin, Clock, User } from "lucide-react";
import { clsx } from "clsx";
import { StatusBadge, ConditionBadge } from "@/components/ui/Badge";
import { formatDistanceToNow } from "date-fns";
import type { Listing, SearchResult } from "@/types";

interface ListingCardProps {
  listing: Listing | SearchResult;
  showRelevance?: boolean;
  className?: string;
}

export function ListingCard({ listing, showRelevance = false, className }: ListingCardProps) {
  const searchResult = listing as SearchResult;
  const isAvailable = listing.status === "Available";
  const isSold = listing.status === "Sold";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={clsx(
        "group flex flex-col rounded-xl border bg-white overflow-hidden transition-all",
        "hover:shadow-md hover:-translate-y-0.5",
        "dark:bg-slate-800 dark:border-slate-700",
        isSold ? "border-slate-200 opacity-75" : "border-slate-200",
        className
      )}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-700 overflow-hidden">
        {listing.primary_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.primary_image}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-1">📦</div>
              <p className="text-xs text-slate-400">No image</p>
            </div>
          </div>
        )}

        {/* Status overlay for non-available */}
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className={clsx(
              "rounded-lg px-3 py-1 text-sm font-bold tracking-wide",
              isSold ? "bg-red-600 text-white" : "bg-amber-500 text-white"
            )}>
              {listing.status.toUpperCase()}
            </span>
          </div>
        )}

        {/* Category badge */}
        {listing.category_name && (
          <div className="absolute top-2 left-2">
            <span className="rounded-full bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm">
              {listing.category_name}
            </span>
          </div>
        )}

        {/* Relevance badge (semantic search) */}
        {showRelevance && searchResult.match_label && (
          <div className="absolute top-2 right-2">
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
              {searchResult.match_label}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Title */}
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {listing.title}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            {listing.price === 0 ? (
              <span className="text-green-600">Free</span>
            ) : (
              <>₹{listing.price.toLocaleString("en-IN")}</>
            )}
          </span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <ConditionBadge condition={listing.condition} />
          {!isAvailable && <StatusBadge status={listing.status} />}
        </div>

        {/* Footer: location + time + seller */}
        <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1">
          {listing.location && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{listing.location}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{listing.seller_name ?? "Unknown"}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="whitespace-nowrap">
                {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
