import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { getOffersByBuyer } from "@/lib/db/queries/offers";
import { getListingsBySeller } from "@/lib/db/queries/listings";
import { query } from "@/lib/db";
import { OffersClient } from "./OffersClient";
import type { Offer } from "@/types";

export const metadata: Metadata = { title: "My Offers" };
export const dynamic = "force-dynamic";

export default async function OffersPage() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login?redirect=/offers");
  }

  // Offers this user made as buyer
  const sentOffers = await getOffersByBuyer(session.id);

  // Offers received on this user's listings
  const receivedOffers = await query<Offer>(`
    SELECT
      o.*,
      u.name        AS buyer_name,
      u.email       AS buyer_email,
      l.title       AS listing_title,
      l.price       AS listing_price,
      l.status      AS listing_status,
      l.seller_id,
      (
        SELECT image_url FROM listing_images li
        WHERE li.listing_id = l.id
        ORDER BY li.display_order ASC LIMIT 1
      ) AS listing_image
    FROM offers o
    INNER JOIN listings l ON o.listing_id = l.id
    INNER JOIN users    u ON o.buyer_id   = u.id
    WHERE l.seller_id = $1
    ORDER BY o.created_at DESC
  `, [session.id]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">
        My Offers
      </h1>
      <OffersClient
        sentOffers={sentOffers}
        receivedOffers={receivedOffers}
        userId={session.id}
      />
    </div>
  );
}
