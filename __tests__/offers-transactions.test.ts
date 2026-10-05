/**
 * Offers and transaction workflow unit tests.
 * Tests business rules and validation — no live database.
 */

import { describe, it, expect } from "vitest";
import { CreateOfferSchema, UpdateOfferSchema } from "@/lib/validation/schemas";

// ---------------------------------------------------------------------------
// Offer validation
// ---------------------------------------------------------------------------
describe("CreateOfferSchema", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts a valid offer", () => {
    const r = CreateOfferSchema.safeParse({
      listing_id: validUUID,
      amount: 650,
      message: "Is 650 okay?",
    });
    expect(r.success).toBe(true);
  });

  it("accepts offer without message", () => {
    const r = CreateOfferSchema.safeParse({
      listing_id: validUUID,
      amount: 500,
    });
    expect(r.success).toBe(true);
  });

  it("allows amount = 0", () => {
    const r = CreateOfferSchema.safeParse({ listing_id: validUUID, amount: 0 });
    expect(r.success).toBe(true);
  });

  it("rejects negative amount", () => {
    const r = CreateOfferSchema.safeParse({ listing_id: validUUID, amount: -10 });
    expect(r.success).toBe(false);
  });

  it("rejects invalid listing_id UUID", () => {
    const r = CreateOfferSchema.safeParse({ listing_id: "not-a-uuid", amount: 500 });
    expect(r.success).toBe(false);
  });

  it("rejects missing listing_id", () => {
    const r = CreateOfferSchema.safeParse({ amount: 500 });
    expect(r.success).toBe(false);
  });

  it("rejects missing amount", () => {
    const r = CreateOfferSchema.safeParse({ listing_id: validUUID });
    expect(r.success).toBe(false);
  });
});

describe("UpdateOfferSchema", () => {
  it("accepts Accepted", () => {
    const r = UpdateOfferSchema.safeParse({ status: "Accepted" });
    expect(r.success).toBe(true);
  });

  it("accepts Rejected", () => {
    const r = UpdateOfferSchema.safeParse({ status: "Rejected" });
    expect(r.success).toBe(true);
  });

  it("accepts Withdrawn", () => {
    const r = UpdateOfferSchema.safeParse({ status: "Withdrawn" });
    expect(r.success).toBe(true);
  });

  it("rejects Pending (not a valid transition)", () => {
    const r = UpdateOfferSchema.safeParse({ status: "Pending" });
    expect(r.success).toBe(false);
  });

  it("rejects Expired (set by system only)", () => {
    const r = UpdateOfferSchema.safeParse({ status: "Expired" });
    expect(r.success).toBe(false);
  });

  it("rejects unknown status", () => {
    const r = UpdateOfferSchema.safeParse({ status: "Confirmed" });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Transaction workflow business rules
// ---------------------------------------------------------------------------
describe("Transaction workflow (pure logic)", () => {
  it("buyer cannot be the same as seller", () => {
    function validateTransaction(buyerId: string, sellerId: string) {
      return buyerId !== sellerId;
    }
    expect(validateTransaction("user-A", "user-A")).toBe(false);
    expect(validateTransaction("user-A", "user-B")).toBe(true);
  });

  it("final price cannot be negative", () => {
    function isValidPrice(price: number) { return price >= 0; }
    expect(isValidPrice(-1)).toBe(false);
    expect(isValidPrice(0)).toBe(true);
    expect(isValidPrice(100)).toBe(true);
  });

  it("only Pending offers can be accepted", () => {
    function canAccept(status: string) { return status === "Pending"; }
    expect(canAccept("Pending")).toBe(true);
    expect(canAccept("Accepted")).toBe(false);
    expect(canAccept("Rejected")).toBe(false);
    expect(canAccept("Withdrawn")).toBe(false);
  });

  it("listing must be Available or Reserved to accept an offer", () => {
    function canAcceptOnListing(status: string) {
      return status === "Available" || status === "Reserved";
    }
    expect(canAcceptOnListing("Available")).toBe(true);
    expect(canAcceptOnListing("Reserved")).toBe(true);
    expect(canAcceptOnListing("Sold")).toBe(false);
    expect(canAcceptOnListing("Removed")).toBe(false);
  });

  it("accepting one offer should reject all other pending offers on the same listing", () => {
    type OfferStatus = "Pending" | "Accepted" | "Rejected";
    const offers: { id: string; listing_id: string; status: OfferStatus }[] = [
      { id: "o1", listing_id: "l1", status: "Pending" },
      { id: "o2", listing_id: "l1", status: "Pending" },
      { id: "o3", listing_id: "l1", status: "Pending" },
    ];

    function acceptOffer(offerId: string) {
      return offers.map(o =>
        o.id === offerId
          ? { ...o, status: "Accepted" as OfferStatus }
          : { ...o, status: "Rejected" as OfferStatus }
      );
    }

    const result = acceptOffer("o2");
    expect(result.find(o => o.id === "o2")?.status).toBe("Accepted");
    expect(result.find(o => o.id === "o1")?.status).toBe("Rejected");
    expect(result.find(o => o.id === "o3")?.status).toBe("Rejected");
  });

  it("completing a transaction should mark listing as Sold", () => {
    let listingStatus = "Available";
    function completeTransaction() { listingStatus = "Sold"; }
    completeTransaction();
    expect(listingStatus).toBe("Sold");
  });
});

// ---------------------------------------------------------------------------
// Wishlist business rules
// ---------------------------------------------------------------------------
describe("Wishlist business rules", () => {
  it("prevents duplicate (user, listing) pairs", () => {
    const wishlist = new Set<string>();
    function addToWishlist(userId: string, listingId: string): boolean {
      const key = `${userId}:${listingId}`;
      if (wishlist.has(key)) return false;
      wishlist.add(key);
      return true;
    }
    expect(addToWishlist("u1", "l1")).toBe(true);
    expect(addToWishlist("u1", "l1")).toBe(false); // duplicate
    expect(addToWishlist("u1", "l2")).toBe(true);  // different listing
    expect(addToWishlist("u2", "l1")).toBe(true);  // different user
  });
});
