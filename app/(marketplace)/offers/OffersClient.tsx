"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package, CheckCircle, XCircle, Clock,
  MessageSquare, ChevronRight
} from "lucide-react";
import { OfferStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDistanceToNow } from "date-fns";
import type { Offer } from "@/types";

interface OffersClientProps {
  sentOffers:     Offer[];
  receivedOffers: Offer[];
  userId:         string;
}

type Tab = "received" | "sent";

export function OffersClient({ sentOffers, receivedOffers, userId: _userId }: OffersClientProps) {
  const router         = useRouter();
  const [tab, setTab]  = useState<Tab>("received");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [localReceived, setLocalReceived] = useState(receivedOffers);
  const [localSent,     setLocalSent]     = useState(sentOffers);
  const [error, setError] = useState<string | null>(null);

  const pendingReceived = localReceived.filter(o => o.status === "Pending").length;
  const pendingSent     = localSent.filter(o => o.status === "Pending").length;

  async function handleAction(offerId: string, action: "Accepted" | "Rejected" | "Withdrawn") {
    setLoading(p => ({ ...p, [offerId]: true }));
    setError(null);
    try {
      const res  = await fetch(`/api/offers/${offerId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: action }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to update offer.");
        return;
      }

      // Update local state
      if (action === "Accepted" || action === "Rejected") {
        setLocalReceived(prev =>
          prev.map(o => o.id === offerId
            ? { ...o, status: action }
            : // If accepted, all other pending offers on same listing become Rejected
              (action === "Accepted" && o.listing_id === prev.find(x => x.id === offerId)?.listing_id && o.status === "Pending")
                ? { ...o, status: "Rejected" as const }
                : o
          )
        );
      } else {
        setLocalSent(prev => prev.map(o => o.id === offerId ? { ...o, status: action } : o));
      }

      // If accepted, refresh to show transaction
      if (action === "Accepted") {
        router.refresh();
      }
    } finally {
      setLoading(p => ({ ...p, [offerId]: false }));
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-6">
        {(["received", "sent"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
              tab === t
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {t === "received" ? "Received" : "Sent"}
            {t === "received" && pendingReceived > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {pendingReceived}
              </span>
            )}
            {t === "sent" && pendingSent > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {pendingSent}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Received offers (on seller's listings) */}
      {tab === "received" && (
        <div className="space-y-4">
          {localReceived.length === 0 ? (
            <EmptyOffers
              message="No offers received yet."
              sub="When buyers make offers on your listings, they will appear here."
              action={<Link href="/listings/new" className="text-indigo-600 hover:underline text-sm font-medium">Create a listing</Link>}
            />
          ) : (
            localReceived.map(offer => (
              <OfferCard
                key={offer.id}
                offer={offer}
                mode="received"
                loading={loading[offer.id] ?? false}
                onAccept={() => handleAction(offer.id, "Accepted")}
                onReject={() => handleAction(offer.id, "Rejected")}
              />
            ))
          )}
        </div>
      )}

      {/* Sent offers (buyer's perspective) */}
      {tab === "sent" && (
        <div className="space-y-4">
          {localSent.length === 0 ? (
            <EmptyOffers
              message="You haven't made any offers yet."
              sub="Find something you like and make an offer."
              action={<Link href="/browse" className="text-indigo-600 hover:underline text-sm font-medium">Browse listings</Link>}
            />
          ) : (
            localSent.map(offer => (
              <OfferCard
                key={offer.id}
                offer={offer}
                mode="sent"
                loading={loading[offer.id] ?? false}
                onWithdraw={() => handleAction(offer.id, "Withdrawn")}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function OfferCard({
  offer, mode, loading,
  onAccept, onReject, onWithdraw,
}: {
  offer: Offer;
  mode: "received" | "sent";
  loading: boolean;
  onAccept?:   () => void;
  onReject?:   () => void;
  onWithdraw?: () => void;
}) {
  const isPending = offer.status === "Pending";

  // Access joined fields (typed as unknown because they're runtime-injected by SQL)
  const o = offer as unknown as Offer & {
    listing_title?: string;
    listing_price?: number;
    listing_status?: string;
    listing_image?: string;
    buyer_name?: string;
    seller_name?: string;
  };

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Listing thumbnail */}
        <Link href={`/listings/${offer.listing_id}`} className="shrink-0">
          <div className="h-16 w-16 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden">
            {o.listing_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={o.listing_image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-6 w-6 text-slate-400" />
              </div>
            )}
          </div>
        </Link>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <Link
                href={`/listings/${offer.listing_id}`}
                className="text-sm font-semibold text-slate-900 dark:text-white hover:text-indigo-600 line-clamp-1"
              >
                {o.listing_title ?? "Listing"}
              </Link>
              <p className="text-xs text-slate-500 mt-0.5">
                Listed at ₹{Number(o.listing_price ?? 0).toLocaleString("en-IN")}
              </p>
            </div>
            <OfferStatusBadge status={offer.status} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-bold text-slate-900 dark:text-white">
              Offer: ₹{Number(offer.amount).toLocaleString("en-IN")}
            </span>
            {mode === "received" && o.buyer_name && (
              <span className="text-slate-500">by {o.buyer_name}</span>
            )}
            {mode === "sent" && o.seller_name && (
              <span className="text-slate-500">to {o.seller_name}</span>
            )}
          </div>

          {offer.message && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">
              &ldquo;{offer.message}&rdquo;
            </p>
          )}

          <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(offer.created_at), { addSuffix: true })}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {isPending && (
        <div className="flex gap-2 px-4 pb-4">
          {mode === "received" && (
            <>
              <Button size="sm" onClick={onAccept} loading={loading} className="flex-1">
                <CheckCircle className="h-3.5 w-3.5" />
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={onReject} disabled={loading} className="flex-1">
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          )}
          {mode === "sent" && (
            <Button size="sm" variant="outline" onClick={onWithdraw} loading={loading}>
              Withdraw offer
            </Button>
          )}
        </div>
      )}

      {/* Accepted → show link to transaction */}
      {offer.status === "Accepted" && (
        <div className="px-4 pb-4">
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-xs text-green-600 hover:underline font-medium"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            View transaction
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </Card>
  );
}

function EmptyOffers({
  message, sub, action,
}: {
  message: string;
  sub:     string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-slate-100 dark:bg-slate-800 p-5">
        <MessageSquare className="h-8 w-8 text-slate-300" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{message}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-xs">{sub}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
