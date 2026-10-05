import { clsx } from "clsx";
import { Package } from "lucide-react";
import { ListingCard } from "./ListingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import type { Listing, SearchResult } from "@/types";

interface ListingGridProps {
  listings: (Listing | SearchResult)[];
  loading?: boolean;
  showRelevance?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  className?: string;
}

export function ListingGrid({
  listings,
  loading = false,
  showRelevance = false,
  emptyTitle = "No listings found",
  emptyDescription = "Try adjusting your filters or search query.",
  emptyAction,
  className,
}: ListingGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div
      className={clsx(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
    >
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          showRelevance={showRelevance}
        />
      ))}
    </div>
  );
}
