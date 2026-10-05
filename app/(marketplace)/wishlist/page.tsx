import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { requireAuth } from "@/lib/auth/session";
import { getWishlistItems } from "@/lib/db/queries/wishlist";
import { WishlistClient } from "./WishlistClient";

export const metadata: Metadata = { title: "My Wishlist" };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login?redirect=/wishlist");
  }

  const items = await getWishlistItems(session.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
          <Heart className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Wishlist</h1>
          <p className="text-sm text-slate-500">
            {items.length} {items.length === 1 ? "item" : "items"} saved
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 rounded-full bg-slate-100 dark:bg-slate-800 p-6">
            <Heart className="h-10 w-10 text-slate-300" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Your wishlist is empty
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-xs">
            Save listings you&apos;re interested in and come back to them later.
          </p>
          <Link
            href="/browse"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            Browse listings
          </Link>
        </div>
      ) : (
        <WishlistClient items={items} />
      )}
    </div>
  );
}
