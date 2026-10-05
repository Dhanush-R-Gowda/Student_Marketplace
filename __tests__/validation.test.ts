import { describe, it, expect } from "vitest";
import { RegisterSchema, LoginSchema, CreateListingSchema, CreateOfferSchema } from "@/lib/validation/schemas";

// Basic smoke tests for validation schemas
describe("RegisterSchema", () => {
  it("accepts valid registration data", () => {
    const result = RegisterSchema.safeParse({
      name: "Arjun Sharma",
      email: "arjun@example.com",
      password: "securepassword123",
      college: "IIT Bombay",
      department: "Computer Science",
      year: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects short name", () => {
    const result = RegisterSchema.safeParse({
      name: "A",
      email: "a@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = RegisterSchema.safeParse({
      name: "Arjun",
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = RegisterSchema.safeParse({
      name: "Arjun",
      email: "arjun@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});

describe("LoginSchema", () => {
  it("accepts valid credentials", () => {
    const result = LoginSchema.safeParse({
      email: "arjun@example.com",
      password: "anypassword",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty password", () => {
    const result = LoginSchema.safeParse({
      email: "arjun@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateListingSchema", () => {
  it("accepts valid listing", () => {
    const result = CreateListingSchema.safeParse({
      title: "Casio FX-991ES Plus Calculator",
      description: "Barely used scientific calculator for engineering maths.",
      category_id: 2,
      condition: "Like New",
      price: 650,
      location: "Hostel Block A",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative price", () => {
    const result = CreateListingSchema.safeParse({
      title: "Test Item",
      description: "Some description here that is long enough",
      category_id: 1,
      condition: "Good",
      price: -100,
      location: "Campus",
    });
    expect(result.success).toBe(false);
  });

  it("allows price = 0 (free item)", () => {
    const result = CreateListingSchema.safeParse({
      title: "Free Textbook",
      description: "Giving away my old semester textbook for free.",
      category_id: 1,
      condition: "Fair",
      price: 0,
      location: "Library",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid condition", () => {
    const result = CreateListingSchema.safeParse({
      title: "Some item",
      description: "Description that is long enough to pass",
      category_id: 1,
      condition: "Excellent", // not a valid enum value
      price: 100,
      location: "Campus",
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateOfferSchema", () => {
  it("accepts valid offer", () => {
    const result = CreateOfferSchema.safeParse({
      listing_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 550,
      message: "Is 550 okay?",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative amount", () => {
    const result = CreateOfferSchema.safeParse({
      listing_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: -10,
    });
    expect(result.success).toBe(false);
  });
});
