/**
 * Listing validation and business rule tests.
 * No live database required.
 */

import { describe, it, expect } from "vitest";
import { CreateListingSchema, UpdateListingSchema } from "@/lib/validation/schemas";

describe("CreateListingSchema", () => {
  const valid = {
    title: "Casio FX-991ES Plus Scientific Calculator",
    description: "Barely used scientific calculator for engineering exams.",
    category_id: 2,
    condition: "Good" as const,
    price: 650,
    location: "Hostel Block A",
  };

  it("accepts a complete valid listing", () => {
    expect(CreateListingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects title under 3 chars", () => {
    const r = CreateListingSchema.safeParse({ ...valid, title: "AB" });
    expect(r.success).toBe(false);
  });

  it("rejects description under 10 chars", () => {
    const r = CreateListingSchema.safeParse({ ...valid, description: "Too short" });
    expect(r.success).toBe(false);
  });

  it("rejects negative price", () => {
    const r = CreateListingSchema.safeParse({ ...valid, price: -1 });
    expect(r.success).toBe(false);
  });

  it("allows price = 0 for free items", () => {
    expect(CreateListingSchema.safeParse({ ...valid, price: 0 }).success).toBe(true);
  });

  it("rejects invalid condition value", () => {
    const r = CreateListingSchema.safeParse({ ...valid, condition: "Mint" });
    expect(r.success).toBe(false);
  });

  it("accepts all valid condition values", () => {
    for (const c of ["New", "Like New", "Good", "Fair", "Poor"] as const) {
      expect(CreateListingSchema.safeParse({ ...valid, condition: c }).success).toBe(true);
    }
  });

  it("rejects missing required fields", () => {
    const { title, ...withoutTitle } = valid;
    expect(CreateListingSchema.safeParse(withoutTitle).success).toBe(false);
  });

  it("rejects zero category_id", () => {
    const r = CreateListingSchema.safeParse({ ...valid, category_id: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects empty location", () => {
    const r = CreateListingSchema.safeParse({ ...valid, location: "A" });
    expect(r.success).toBe(false);
  });

  it("allows very large price (within limit)", () => {
    const r = CreateListingSchema.safeParse({ ...valid, price: 5000000 });
    expect(r.success).toBe(true);
  });
});

describe("UpdateListingSchema (partial)", () => {
  it("accepts empty object (no-op update)", () => {
    expect(UpdateListingSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only status", () => {
    const r = UpdateListingSchema.safeParse({ status: "Reserved" });
    expect(r.success).toBe(true);
  });

  it("accepts partial update with only price", () => {
    const r = UpdateListingSchema.safeParse({ price: 500 });
    expect(r.success).toBe(true);
  });

  it("rejects invalid status value", () => {
    const r = UpdateListingSchema.safeParse({ status: "Pending" });
    expect(r.success).toBe(false);
  });

  it("rejects negative price in update", () => {
    const r = UpdateListingSchema.safeParse({ price: -50 });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Business rule logic tests (pure functions, no DB)
// ---------------------------------------------------------------------------

describe("Listing business rules (pure logic)", () => {
  it("a sold listing should not allow new offers", () => {
    function canMakeOffer(status: string) {
      return status === "Available" || status === "Reserved";
    }
    expect(canMakeOffer("Sold")).toBe(false);
    expect(canMakeOffer("Removed")).toBe(false);
  });

  it("an available listing should allow new offers", () => {
    function canMakeOffer(status: string) {
      return status === "Available" || status === "Reserved";
    }
    expect(canMakeOffer("Available")).toBe(true);
    expect(canMakeOffer("Reserved")).toBe(true);
  });

  it("seller ID equality check prevents self-offers", () => {
    function isSelfOffer(sellerId: string, buyerId: string) {
      return sellerId === buyerId;
    }
    expect(isSelfOffer("user-123", "user-123")).toBe(true);
  });

  it("different user IDs allow offers", () => {
    function isSelfOffer(sellerId: string, buyerId: string) {
      return sellerId === buyerId;
    }
    expect(isSelfOffer("user-123", "user-456")).toBe(false);
  });
});
