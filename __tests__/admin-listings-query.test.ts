/**
 * Regression tests for getAdminListings — parameterized query safety.
 *
 * Problem fixed: app/admin/listings/page.tsx previously interpolated the
 * raw `status` URL query parameter directly into SQL:
 *
 *   const where = status !== "all" ? `WHERE l.status = '${status}'` : "";
 *
 * A request like ?status=Available'+OR+'1'='1 could inject arbitrary SQL.
 *
 * Fix: getAdminListings() validates status against an explicit allowlist
 * before any query runs.  Unrecognised values (including "all") produce no
 * WHERE clause.  The validated value is always passed as a $1 parameter —
 * never interpolated into SQL text.
 *
 * These tests assert:
 *   1.  Valid status values are passed as $1 parameter, not interpolated.
 *   2.  "all" produces no WHERE clause and no status parameter.
 *   3.  Unknown / malicious strings are rejected by the allowlist and produce
 *       no WHERE clause and no status parameter.
 *   4.  Pagination parameters (LIMIT, OFFSET) are correct for each case.
 *   5.  Status $1 parameter shifts pagination indices to $2 / $3.
 *   6.  The SQL text never contains the raw status string when filtered.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  query:    vi.fn(),
  queryOne: vi.fn(),
  withTransaction: vi.fn(),
  default:  vi.fn(),
}));

import { query } from "@/lib/db";
import { getAdminListings } from "@/lib/db/queries/listings";

const mockQuery = vi.mocked(query);

// Minimal stub rows so the function can parse COUNT(*) and return listings.
function mockDbCalls(total = 0) {
  mockQuery
    .mockResolvedValueOnce([{ total: String(total) }]) // COUNT query
    .mockResolvedValueOnce([]);                         // SELECT query
}

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// 1. Valid status values are parameterized
// ---------------------------------------------------------------------------
describe("getAdminListings — valid status filter", () => {
  const VALID = ["Available", "Reserved", "Sold", "Removed"] as const;

  for (const status of VALID) {
    it(`passes "${status}" as $1 parameter and uses WHERE l.status = $1`, async () => {
      mockDbCalls();
      await getAdminListings({ status });

      // Both COUNT and SELECT queries run — check both.
      expect(mockQuery).toHaveBeenCalledTimes(2);

      for (const call of mockQuery.mock.calls as [string, unknown[]][]) {
        const [sql, params] = call;

        // The SQL must contain the parameterized placeholder, not the raw value.
        expect(sql).toMatch(/WHERE l\.status\s*=\s*\$1/i);

        // The raw status string must NOT appear anywhere in the SQL text.
        expect(sql).not.toContain(status);

        // The status must appear as the first element of the params array.
        expect(params[0]).toBe(status);
      }
    });

    it(`"${status}" — pagination uses $2 (LIMIT) and $3 (OFFSET)`, async () => {
      mockDbCalls();
      await getAdminListings({ status, page: 2, limit: 20 });

      // The SELECT query (second call) must have [status, 20, 20] as params.
      const [, selectParams] = mockQuery.mock.calls[1] as [string, unknown[]];
      expect(selectParams[0]).toBe(status); // $1 = status
      expect(selectParams[1]).toBe(20);     // $2 = LIMIT
      expect(selectParams[2]).toBe(20);     // $3 = OFFSET = (2-1)*20
    });
  }
});

// ---------------------------------------------------------------------------
// 2. "all" produces no WHERE clause and no status parameter
// ---------------------------------------------------------------------------
describe("getAdminListings — status = 'all' (no filter)", () => {
  it("produces no WHERE clause", async () => {
    mockDbCalls();
    await getAdminListings({ status: "all" });

    for (const call of mockQuery.mock.calls as [string, unknown[]][]) {
      const [sql] = call;
      expect(sql).not.toMatch(/WHERE l\.status/i);
    }
  });

  it("passes no status parameter", async () => {
    mockDbCalls();
    await getAdminListings({ status: "all" });

    const [, countParams] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(countParams).toEqual([]); // no params for COUNT

    const [, selectParams] = mockQuery.mock.calls[1] as [string, unknown[]];
    // params are just [limit, offset] — no status
    expect(selectParams[0]).toBeTypeOf("number"); // LIMIT
    expect(selectParams[1]).toBeTypeOf("number"); // OFFSET
  });

  it("pagination uses $1 (LIMIT) and $2 (OFFSET)", async () => {
    mockDbCalls();
    await getAdminListings({ status: "all", page: 3, limit: 10 });

    const [, selectParams] = mockQuery.mock.calls[1] as [string, unknown[]];
    expect(selectParams[0]).toBe(10);  // $1 = LIMIT
    expect(selectParams[1]).toBe(20);  // $2 = OFFSET = (3-1)*10
  });
});

// ---------------------------------------------------------------------------
// 3. Unknown / malicious status values are rejected by the allowlist
// ---------------------------------------------------------------------------
describe("getAdminListings — unrecognised / injection status values", () => {
  const EVIL_INPUTS = [
    "Available' OR '1'='1",
    "'; DROP TABLE listings; --",
    "<script>alert(1)</script>",
    "unknown-value",
    "",
    "available",   // wrong case — not in allowlist
    "AVAILABLE",
    "1=1",
  ];

  for (const badStatus of EVIL_INPUTS) {
    it(`rejects "${badStatus.slice(0, 40)}" — no WHERE clause, no status param`, async () => {
      mockDbCalls();
      await getAdminListings({ status: badStatus });

      for (const call of mockQuery.mock.calls as [string, unknown[]][]) {
        const [sql, params] = call;

        // No status filter in SQL.
        expect(sql).not.toMatch(/WHERE l\.status/i);

        // The raw bad string must never appear in SQL.
        // (Check the first 20 chars to avoid regex issues with special chars.)
        const dangerSlice = badStatus.slice(0, 20);
        if (dangerSlice.length > 0) {
          expect(sql).not.toContain(dangerSlice);
        }

        // params must not contain the bad string.
        expect(params).not.toContain(badStatus);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Undefined status (no query param at all) = no filter
// ---------------------------------------------------------------------------
describe("getAdminListings — undefined status", () => {
  it("produces no WHERE clause when status is undefined", async () => {
    mockDbCalls();
    await getAdminListings({});  // no status key

    for (const call of mockQuery.mock.calls as [string, unknown[]][]) {
      const [sql] = call;
      expect(sql).not.toMatch(/WHERE l\.status/i);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Return shape
// ---------------------------------------------------------------------------
describe("getAdminListings — return shape", () => {
  it("returns total and listings array", async () => {
    mockQuery
      .mockResolvedValueOnce([{ total: "42" }])
      .mockResolvedValueOnce([{ id: "abc", title: "Test" }]);

    const result = await getAdminListings({ status: "Available" });
    expect(result.total).toBe(42);
    expect(result.listings).toHaveLength(1);
  });

  it("returns zero total and empty array when no results", async () => {
    mockDbCalls(0);
    const result = await getAdminListings({ status: "Sold" });
    expect(result.total).toBe(0);
    expect(result.listings).toEqual([]);
  });

  it("handles missing count row gracefully", async () => {
    mockQuery
      .mockResolvedValueOnce([])  // count returns nothing
      .mockResolvedValueOnce([]);
    const result = await getAdminListings({});
    expect(result.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Pagination math
// ---------------------------------------------------------------------------
describe("getAdminListings — pagination", () => {
  it("page 1 offset is 0", async () => {
    mockDbCalls();
    await getAdminListings({ page: 1, limit: 20 });
    const [, selectParams] = mockQuery.mock.calls[1] as [string, unknown[]];
    const offset = selectParams[selectParams.length - 1];
    expect(offset).toBe(0);
  });

  it("page 2 offset equals limit", async () => {
    mockDbCalls();
    await getAdminListings({ page: 2, limit: 20 });
    const [, selectParams] = mockQuery.mock.calls[1] as [string, unknown[]];
    const offset = selectParams[selectParams.length - 1];
    expect(offset).toBe(20);
  });

  it("page 5 limit 10 gives offset 40", async () => {
    mockDbCalls();
    await getAdminListings({ page: 5, limit: 10 });
    const [, selectParams] = mockQuery.mock.calls[1] as [string, unknown[]];
    const offset = selectParams[selectParams.length - 1];
    expect(offset).toBe(40);
  });
});
