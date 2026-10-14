"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, ShoppingBag, Tag, Package, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { format } from "date-fns";
import type { Transaction } from "@/types";

interface TransactionsClientProps {
  transactions: Transaction[];
  userId: string;
}

type Tab = "all" | "purchases" | "sales";

export function TransactionsClient({ transactions, userId }: TransactionsClientProps) {
  const [tab, setTab] = useState<Tab>("all");

  const filtered = transactions.filter(t => {
    if (tab === "purchases") return t.buyer_id  === userId;
    if (tab === "sales")     return t.seller_id === userId;
    return true;
  });

  const totalSpent = transactions
    .filter(t => t.buyer_id === userId && t.transaction_status === "Completed")
    .reduce((sum, t) => sum + Number(t.final_price), 0);

  const totalEarned = transactions
    .filter(t => t.seller_id === userId && t.transaction_status === "Completed")
    .reduce((sum, t) => sum + Number(t.final_price), 0);

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total transactions", value: transactions.length, icon: ArrowLeftRight, color: "text-indigo-600" },
          { label: "Total spent",  value: `₹${totalSpent.toLocaleString("en-IN")}`,  icon: ShoppingBag, color: "text-red-500" },
          { label: "Total earned", value: `₹${totalEarned.toLocaleString("en-IN")}`, icon: Tag,         color: "text-green-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} padding="sm" className="text-center">
            <Icon className={`h-5 w-5 ${color} mx-auto mb-1`} />
            <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-6">
        {(["all", "purchases", "sales"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-all ${
              tab === t
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {t} {t === "all" ? `(${transactions.length})` : t === "purchases"
              ? `(${transactions.filter(x => x.buyer_id === userId).length})`
              : `(${transactions.filter(x => x.seller_id === userId).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-slate-100 dark:bg-slate-800 p-5">
            <ArrowLeftRight className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No transactions yet
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {tab === "purchases"
              ? "You haven't bought anything yet."
              : tab === "sales"
              ? "You haven't sold anything yet."
              : "No transactions to show."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(tx => {
            const isBuyer  = tx.buyer_id  === userId;
            const otherParty = isBuyer ? tx.seller_name : tx.buyer_name;

            return (
              <Card key={tx.id} padding="none" className="overflow-hidden">
                <div className="flex gap-4 p-4">
                  {/* Image */}
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    {(tx as unknown as { listing_image?: string }).listing_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={(tx as unknown as { listing_image: string }).listing_image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <Link
                        href={`/listings/${tx.listing_id}`}
                        className="text-sm font-semibold text-slate-900 dark:text-white hover:text-indigo-600 line-clamp-1"
                      >
                        {tx.listing_title ?? "Listing"}
                      </Link>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        tx.transaction_status === "Completed"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : tx.transaction_status === "Cancelled"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>
                        {tx.transaction_status}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="font-bold text-slate-900 dark:text-white">
                        ₹{Number(tx.final_price).toLocaleString("en-IN")}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${isBuyer ? "text-red-600" : "text-green-600"}`}>
                        {isBuyer ? (
                          <><ShoppingBag className="h-3 w-3" /> Bought</>
                        ) : (
                          <><Tag className="h-3 w-3" /> Sold</>
                        )}
                      </span>
                      {otherParty && (
                        <span className="text-slate-500 text-xs">
                          {isBuyer ? "from" : "to"} {otherParty}
                        </span>
                      )}
                    </div>

                    {tx.completed_at && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {format(new Date(tx.completed_at), "dd MMM yyyy, h:mm a")}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
