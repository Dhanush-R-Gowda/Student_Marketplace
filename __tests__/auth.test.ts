/**
 * Auth unit tests
 * These test the JWT session logic without requiring a live database.
 * Runs in node environment (see vitest.config.ts).
 */

import { describe, it, expect, vi } from "vitest";

// Mock next/headers — not available outside Next.js runtime
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  }),
}));

// Mock next/server for NextRequest (not needed in node tests)
vi.mock("next/server", () => ({
  NextRequest: class {},
  NextResponse: { json: vi.fn() },
}));

// Set a valid AUTH_SECRET before importing session module
process.env.AUTH_SECRET = "test_secret_key_that_is_at_least_32_chars_long";

import { signToken, verifyToken } from "@/lib/auth/session";
import type { SessionUser } from "@/types";

const mockUser: SessionUser = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Arjun Sharma",
  email: "arjun@example.com",
  role: "student",
  status: "active",
};

describe("JWT session tokens", () => {
  it("signs and verifies a valid token", async () => {
    const token = await signToken(mockUser);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // JWT has 3 parts

    const decoded = await verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(mockUser.id);
    expect(decoded?.email).toBe(mockUser.email);
    expect(decoded?.role).toBe(mockUser.role);
  });

  it("returns null for a tampered token", async () => {
    const token = await signToken(mockUser);
    const tampered = token.slice(0, -5) + "XXXXX";
    const result = await verifyToken(tampered);
    expect(result).toBeNull();
  });

  it("returns null for an empty string", async () => {
    const result = await verifyToken("");
    expect(result).toBeNull();
  });

  it("returns null for a garbage string", async () => {
    const result = await verifyToken("not.a.jwt");
    expect(result).toBeNull();
  });

  it("preserves all session fields in the token", async () => {
    const adminUser: SessionUser = {
      id: "admin-uuid-1234",
      name: "Admin",
      email: "admin@example.com",
      role: "admin",
      status: "active",
    };
    const token = await signToken(adminUser);
    const decoded = await verifyToken(token);

    expect(decoded?.role).toBe("admin");
    expect(decoded?.name).toBe("Admin");
    expect(decoded?.status).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// Password validation logic (via zod schemas)
// ---------------------------------------------------------------------------
import { RegisterSchema, LoginSchema } from "@/lib/validation/schemas";

describe("Auth validation schemas", () => {
  describe("Registration", () => {
    it("requires name at least 2 chars", () => {
      const r = RegisterSchema.safeParse({ name: "A", email: "a@b.com", password: "12345678" });
      expect(r.success).toBe(false);
    });

    it("requires valid email format", () => {
      const r = RegisterSchema.safeParse({ name: "Alice", email: "notanemail", password: "12345678" });
      expect(r.success).toBe(false);
    });

    it("requires password >= 8 chars", () => {
      const r = RegisterSchema.safeParse({ name: "Alice", email: "alice@test.com", password: "short" });
      expect(r.success).toBe(false);
    });

    it("accepts optional fields", () => {
      const r = RegisterSchema.safeParse({
        name: "Alice",
        email: "alice@test.com",
        password: "password123",
        college: "IIT",
        department: "CS",
        year: 2,
      });
      expect(r.success).toBe(true);
    });

    it("rejects year outside 1-6", () => {
      const r = RegisterSchema.safeParse({
        name: "Alice",
        email: "alice@test.com",
        password: "password123",
        year: 0,
      });
      expect(r.success).toBe(false);
    });
  });

  describe("Login", () => {
    it("accepts valid credentials shape", () => {
      const r = LoginSchema.safeParse({ email: "alice@test.com", password: "anyvalue" });
      expect(r.success).toBe(true);
    });

    it("rejects missing email", () => {
      const r = LoginSchema.safeParse({ password: "anyvalue" });
      expect(r.success).toBe(false);
    });

    it("rejects empty password", () => {
      const r = LoginSchema.safeParse({ email: "alice@test.com", password: "" });
      expect(r.success).toBe(false);
    });
  });
});
