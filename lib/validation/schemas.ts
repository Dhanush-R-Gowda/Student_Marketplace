import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

export const RegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
  college: z.string().max(200).optional(),
  department: z.string().max(200).optional(),
  year: z.number().int().min(1).max(6).optional(),
});

export const LoginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ---------------------------------------------------------------------------
// Listing schemas
// ---------------------------------------------------------------------------

export const LISTING_CONDITIONS = [
  "New",
  "Like New",
  "Good",
  "Fair",
  "Poor",
] as const;

export const LISTING_STATUSES = [
  "Available",
  "Reserved",
  "Sold",
  "Removed",
] as const;

export const CreateListingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000),
  category_id: z.number().int().positive("Category is required"),
  condition: z.enum(LISTING_CONDITIONS, {
    error: "Invalid condition value",
  }),
  price: z.number().min(0, "Price cannot be negative").max(10000000),
  location: z.string().min(2, "Location is required").max(200),
});

export const UpdateListingSchema = CreateListingSchema.partial().extend({
  status: z.enum(LISTING_STATUSES).optional(),
});

// ---------------------------------------------------------------------------
// Offer schemas
// ---------------------------------------------------------------------------

export const CreateOfferSchema = z.object({
  listing_id: z.string().uuid("Invalid listing ID"),
  amount: z.number().min(0, "Offer amount cannot be negative"),
  message: z.string().max(500).optional(),
});

export const UpdateOfferSchema = z.object({
  status: z.enum(["Accepted", "Rejected", "Withdrawn"]),
});

// ---------------------------------------------------------------------------
// Report schemas
// ---------------------------------------------------------------------------

export const REPORT_REASONS = [
  "Inappropriate content",
  "Misleading listing",
  "Spam",
  "Prohibited item",
  "Fraud",
  "Other",
] as const;

export const CreateReportSchema = z.object({
  listing_id: z.string().uuid("Invalid listing ID"),
  reason: z.enum(REPORT_REASONS),
  description: z.string().max(1000).optional(),
});

// ---------------------------------------------------------------------------
// Search schemas
// ---------------------------------------------------------------------------

export const SearchQuerySchema = z.object({
  q: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  condition: z.enum(LISTING_CONDITIONS).optional(),
  location: z.string().max(200).optional(),
  status: z.enum(LISTING_STATUSES).optional(),
  sellerId: z.string().uuid().optional(),
  sortBy: z
    .enum(["relevance", "newest", "price_asc", "price_desc"])
    .optional()
    .default("newest"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// ---------------------------------------------------------------------------
// Admin schemas
// ---------------------------------------------------------------------------

export const UpdateUserStatusSchema = z.object({
  status: z.enum(["active", "suspended", "deactivated"]),
});

export const UpdateReportStatusSchema = z.object({
  status: z.enum(["Reviewing", "Resolved", "Dismissed"]),
});
