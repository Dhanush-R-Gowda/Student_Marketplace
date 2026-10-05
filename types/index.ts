// =============================================================================
// Shared TypeScript types for the Second-Hand Student Marketplace
// These mirror the database schema and are used across frontend + backend.
// =============================================================================

// ---------------------------------------------------------------------------
// Auth / Session
// ---------------------------------------------------------------------------

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
  status: UserStatus;
}

// ---------------------------------------------------------------------------
// Enums (kept as string unions for simplicity; mirrored in DB CHECK constraints)
// ---------------------------------------------------------------------------

export type UserStatus = "active" | "suspended" | "deactivated";
export type UserRole = "student" | "admin";

export type ListingStatus = "Available" | "Reserved" | "Sold" | "Removed";
export type ListingCondition = "New" | "Like New" | "Good" | "Fair" | "Poor";

export type OfferStatus =
  | "Pending"
  | "Accepted"
  | "Rejected"
  | "Withdrawn"
  | "Expired";

export type TransactionStatus = "Completed" | "Cancelled" | "Disputed";

export type ReportStatus = "Pending" | "Reviewing" | "Resolved" | "Dismissed";

// ---------------------------------------------------------------------------
// Database entity types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  role_id: number;
  role_name?: UserRole;
  name: string;
  email: string;
  college: string | null;
  department: string | null;
  year: number | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  icon: string | null;
  created_at: string;
  subcategories?: Category[];
}

export interface Listing {
  id: string;
  seller_id: string;
  category_id: number;
  title: string;
  description: string;
  price: number;
  condition: ListingCondition;
  location: string;
  status: ListingStatus;
  searchable_text: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  seller_name?: string;
  seller_email?: string;
  seller_college?: string;
  category_name?: string;
  category_slug?: string;
  images?: ListingImage[];
  primary_image?: string;
}

export interface ListingImage {
  id: number;
  listing_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export interface Wishlist {
  id: number;
  user_id: string;
  created_at: string;
}

export interface WishlistItem {
  id: number;
  wishlist_id: number;
  listing_id: string;
  added_at: string;
  // Joined listing fields
  listing?: Listing;
}

export interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  amount: number;
  message: string | null;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  buyer_name?: string;
  buyer_email?: string;
  listing_title?: string;
  listing_price?: number;
  listing_status?: ListingStatus;
  seller_id?: string;
}

export interface Transaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offer_id: string;
  final_price: number;
  transaction_status: TransactionStatus;
  completed_at: string | null;
  created_at: string;
  // Joined fields
  listing_title?: string;
  buyer_name?: string;
  seller_name?: string;
  listing_image?: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  listing_id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  // Joined fields
  reporter_name?: string;
  listing_title?: string;
  reviewer_name?: string;
}

export interface ListingStatusHistory {
  id: number;
  listing_id: string;
  old_status: ListingStatus | null;
  new_status: ListingStatus;
  changed_at: string;
  changed_by: string | null;
  changer_name?: string;
}

export interface Notification {
  id: number;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  related_listing_id: string | null;
  related_offer_id: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Search types
// ---------------------------------------------------------------------------

export interface SearchParams {
  query?: string;
  category?: string;       // category slug
  minPrice?: number;
  maxPrice?: number;
  condition?: ListingCondition;
  location?: string;
  status?: ListingStatus;
  sellerId?: string;
  sortBy?: "relevance" | "newest" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}

export interface SearchResult extends Listing {
  // Relevance scoring breakdown (only present when query is provided)
  relevance_score?: number;
  semantic_score?: number;
  keyword_score?: number;
  match_label?: string; // "Best Match", "Great Match", "Good Match", etc.
}

export interface SearchResponse {
  listings: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  searchMode: "hybrid" | "keyword" | "filter-only";
}

// ---------------------------------------------------------------------------
// API response wrappers
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// Form / Input types
// ---------------------------------------------------------------------------

export interface CreateListingInput {
  title: string;
  description: string;
  category_id: number;
  condition: ListingCondition;
  price: number;
  location: string;
}

export interface UpdateListingInput extends Partial<CreateListingInput> {
  status?: ListingStatus;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  college?: string;
  department?: string;
  year?: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateOfferInput {
  listing_id: string;
  amount: number;
  message?: string;
}

// ---------------------------------------------------------------------------
// Analytics types
// ---------------------------------------------------------------------------

export interface MarketplaceStats {
  total_users: number;
  active_users: number;
  total_listings: number;
  available_listings: number;
  sold_listings: number;
  pending_offers: number;
  completed_transactions: number;
  pending_reports: number;
  avg_listing_price: number;
}

export interface CategoryStats {
  category_name: string;
  listing_count: number;
  sold_count: number;
}

export interface SellerStats {
  seller_id: string;
  seller_name: string;
  active_listings: number;
  sold_listings: number;
  total_revenue: number;
}
