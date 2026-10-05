-- =============================================================================
-- Migration 002: Indexes
-- Second-Hand Student Marketplace
-- =============================================================================
-- Every index below has a stated justification.
-- We do NOT blindly index every column — only columns that are:
--   (a) frequently filtered/sorted in queries, or
--   (b) used in JOINs, or
--   (c) support search features
-- =============================================================================

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

-- Login: WHERE email = $1 (unique lookup — most frequent auth query)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
    ON users (email);

-- Filter by status: WHERE status = 'active' (admin moderation, auth checks)
CREATE INDEX IF NOT EXISTS idx_users_status
    ON users (status);

-- Filter by role: admin listing, student listing
CREATE INDEX IF NOT EXISTS idx_users_role_id
    ON users (role_id);

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------

-- Browse by seller: My Listings page — WHERE seller_id = $1
CREATE INDEX IF NOT EXISTS idx_listings_seller_id
    ON listings (seller_id);

-- Browse by category: category filter — WHERE category_id = $1
CREATE INDEX IF NOT EXISTS idx_listings_category_id
    ON listings (category_id);

-- Status filter: most common filter — WHERE status = 'Available'
CREATE INDEX IF NOT EXISTS idx_listings_status
    ON listings (status);

-- Price range filter: WHERE price BETWEEN $1 AND $2
-- Also supports ORDER BY price ASC/DESC
CREATE INDEX IF NOT EXISTS idx_listings_price
    ON listings (price);

-- Location filter: WHERE location ILIKE $1
CREATE INDEX IF NOT EXISTS idx_listings_location
    ON listings (location);

-- Sort by newest: ORDER BY created_at DESC (home page, browse page)
CREATE INDEX IF NOT EXISTS idx_listings_created_at
    ON listings (created_at DESC);

-- Composite: status + created_at — browse available listings newest first
-- Most common query on the browse page
CREATE INDEX IF NOT EXISTS idx_listings_status_created
    ON listings (status, created_at DESC);

-- Composite: category + status — browse a category showing only available items
CREATE INDEX IF NOT EXISTS idx_listings_category_status
    ON listings (category_id, status);

-- ---------------------------------------------------------------------------
-- Full-Text Search index on searchable_text (GIN)
-- GIN (Generalized Inverted Index) is optimal for tsvector columns.
-- Supports: @@ operator, plainto_tsquery, websearch_to_tsquery
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_listings_fts
    ON listings USING GIN (searchable_text);

-- ---------------------------------------------------------------------------
-- Vector (pgvector) index on embedding column
-- IVFFlat: inverted file with flat quantization — good balance of speed/recall
-- for datasets up to ~100K rows. nlist=100 is the recommended starting point.
-- operator class: vector_cosine_ops (we use cosine distance for similarity)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_listings_embedding
    ON listings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- listing_images
-- ---------------------------------------------------------------------------

-- Retrieve images for a listing: WHERE listing_id = $1 ORDER BY display_order
CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id
    ON listing_images (listing_id, display_order);

-- ---------------------------------------------------------------------------
-- wishlist_items
-- ---------------------------------------------------------------------------

-- Retrieve wishlist items for a user (via wishlist_id join)
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id
    ON wishlist_items (wishlist_id);

-- Check if a listing is wishlisted: WHERE listing_id = $1
CREATE INDEX IF NOT EXISTS idx_wishlist_items_listing_id
    ON wishlist_items (listing_id);

-- ---------------------------------------------------------------------------
-- offers
-- ---------------------------------------------------------------------------

-- All offers on a listing: WHERE listing_id = $1 (seller views)
CREATE INDEX IF NOT EXISTS idx_offers_listing_id
    ON offers (listing_id);

-- All offers by a buyer: WHERE buyer_id = $1 (buyer's offer history)
CREATE INDEX IF NOT EXISTS idx_offers_buyer_id
    ON offers (buyer_id);

-- Filter pending offers: WHERE status = 'Pending'
CREATE INDEX IF NOT EXISTS idx_offers_status
    ON offers (status);

-- Composite: listing + status — get pending offers on a specific listing
CREATE INDEX IF NOT EXISTS idx_offers_listing_status
    ON offers (listing_id, status);

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------

-- Purchase history: WHERE buyer_id = $1
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id
    ON transactions (buyer_id);

-- Sales history: WHERE seller_id = $1
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id
    ON transactions (seller_id);

-- Listing transaction lookup: WHERE listing_id = $1
CREATE INDEX IF NOT EXISTS idx_transactions_listing_id
    ON transactions (listing_id);

-- Sort by completion date: ORDER BY completed_at DESC
CREATE INDEX IF NOT EXISTS idx_transactions_completed_at
    ON transactions (completed_at DESC);

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------

-- Admin review queue: WHERE status = 'Pending'
CREATE INDEX IF NOT EXISTS idx_reports_status
    ON reports (status);

-- Reports about a specific listing
CREATE INDEX IF NOT EXISTS idx_reports_listing_id
    ON reports (listing_id);

-- Reports by a user
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id
    ON reports (reporter_id);

-- ---------------------------------------------------------------------------
-- listing_status_history
-- ---------------------------------------------------------------------------

-- Audit trail for a listing
CREATE INDEX IF NOT EXISTS idx_status_history_listing_id
    ON listing_status_history (listing_id, changed_at DESC);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

-- User's notification feed: WHERE user_id = $1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON notifications (user_id, created_at DESC);

-- Unread count: WHERE user_id = $1 AND is_read = FALSE
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications (user_id, is_read) WHERE is_read = FALSE;
