-- =============================================================================
-- Migration 001: Core Schema
-- Second-Hand Student Marketplace
-- =============================================================================
-- Normalization: All tables are in 3NF.
-- - No repeating groups.
-- - No partial dependencies (all tables have single-column surrogate PKs).
-- - No transitive dependencies (categories not stored in listings, only FK).
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable vector search (pgvector)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enable full-text search dictionaries (usually present by default)
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy matching (optional)

-- =============================================================================
-- TABLE: roles
-- Lookup table for user roles. Separate from users to allow easy expansion.
-- =============================================================================
CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(200),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed base roles
INSERT INTO roles (name, description) VALUES
    ('student', 'Regular student user — can buy and sell'),
    ('admin',   'Platform administrator — full moderation access')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- TABLE: users
-- Stores all users. A user can act as both buyer and seller.
-- email is UNIQUE — the natural business key.
-- password_hash stores bcrypt hash; plaintext is never stored.
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id       INTEGER      NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    college       VARCHAR(200),
    department    VARCHAR(200),
    year          INTEGER      CHECK (year BETWEEN 1 AND 6),
    status        VARCHAR(20)  NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'suspended', 'deactivated')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: categories
-- Self-referencing for subcategories (parent_id → categories.id).
-- Using a separate table prevents hardcoding category data in the app.
-- =============================================================================
CREATE TABLE IF NOT EXISTS categories (
    id         SERIAL       PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    slug       VARCHAR(100) NOT NULL UNIQUE,
    parent_id  INTEGER      REFERENCES categories(id) ON DELETE SET NULL,
    icon       VARCHAR(50),  -- lucide-react icon name
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: listings
-- Core marketplace entity.
-- searchable_text: denormalized concatenation for FTS — justified because
--   it represents a derived read optimization, not business logic redundancy.
-- embedding: pgvector column for semantic search.
-- price CHECK ensures non-negative; NULL is not allowed.
-- =============================================================================
CREATE TABLE IF NOT EXISTS listings (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id        UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id      INTEGER       NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    title            VARCHAR(200)  NOT NULL,
    description      TEXT          NOT NULL,
    price            NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    condition        VARCHAR(20)   NOT NULL
                                   CHECK (condition IN ('New', 'Like New', 'Good', 'Fair', 'Poor')),
    location         VARCHAR(200)  NOT NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'Available'
                                   CHECK (status IN ('Available', 'Reserved', 'Sold', 'Removed')),
    -- Denormalized field for full-text search (maintained by trigger)
    searchable_text  TSVECTOR,
    -- pgvector embedding (1536 dim for OpenAI text-embedding-3-small)
    embedding        VECTOR(1536),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: listing_images
-- Multiple images per listing. display_order controls gallery sequence.
-- ON DELETE CASCADE: removing a listing removes all its images.
-- =============================================================================
CREATE TABLE IF NOT EXISTS listing_images (
    id            SERIAL       PRIMARY KEY,
    listing_id    UUID         NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    image_url     VARCHAR(500) NOT NULL,
    display_order INTEGER      NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: wishlists
-- One wishlist per user. Enforced by UNIQUE(user_id).
-- =============================================================================
CREATE TABLE IF NOT EXISTS wishlists (
    id         SERIAL      PRIMARY KEY,
    user_id    UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: wishlist_items
-- Junction table between wishlists and listings.
-- UNIQUE(wishlist_id, listing_id) prevents duplicate wishlist entries.
-- This enforces the business rule at the DB level, not just application level.
-- =============================================================================
CREATE TABLE IF NOT EXISTS wishlist_items (
    id          SERIAL      PRIMARY KEY,
    wishlist_id INTEGER     NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    listing_id  UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_wishlist_listing UNIQUE (wishlist_id, listing_id)
);

-- =============================================================================
-- TABLE: offers
-- Buyers make offers on listings. Multiple offers per listing are allowed
-- (competitive marketplace), but only one can be Accepted.
-- Enforced via trigger (T_prevent_duplicate_accepted).
-- =============================================================================
CREATE TABLE IF NOT EXISTS offers (
    id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID          NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id   UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount     NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    message    TEXT,
    status     VARCHAR(20)   NOT NULL DEFAULT 'Pending'
                             CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Withdrawn', 'Expired')),
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    -- A buyer cannot have two pending offers on the same listing
    CONSTRAINT uq_one_pending_offer_per_buyer
        EXCLUDE USING btree (listing_id WITH =, buyer_id WITH =)
        WHERE (status = 'Pending')
);

-- =============================================================================
-- TABLE: transactions
-- Created when an offer is accepted and the listing is sold.
-- Preserves historical seller/buyer/price even if users are later deleted.
-- offer_id: links back to the accepted offer for audit trail.
-- =============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id         UUID          NOT NULL REFERENCES listings(id) ON DELETE RESTRICT,
    buyer_id           UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seller_id          UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    offer_id           UUID          NOT NULL UNIQUE REFERENCES offers(id) ON DELETE RESTRICT,
    final_price        NUMERIC(12,2) NOT NULL CHECK (final_price >= 0),
    transaction_status VARCHAR(20)   NOT NULL DEFAULT 'Completed'
                                     CHECK (transaction_status IN ('Completed', 'Cancelled', 'Disputed')),
    completed_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: reports
-- Users can report listings. Admins review reports.
-- reviewed_by FK references the admin who reviewed.
-- =============================================================================
CREATE TABLE IF NOT EXISTS reports (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id  UUID         NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    reason      VARCHAR(100) NOT NULL,
    description TEXT,
    status      VARCHAR(20)  NOT NULL DEFAULT 'Pending'
                             CHECK (status IN ('Pending', 'Reviewing', 'Resolved', 'Dismissed')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID         REFERENCES users(id) ON DELETE SET NULL,
    -- A user cannot report the same listing twice
    CONSTRAINT uq_one_report_per_user_listing UNIQUE (reporter_id, listing_id)
);

-- =============================================================================
-- TABLE: listing_status_history
-- Audit trail: every time a listing's status changes, a row is inserted here.
-- Maintained by trigger T_listing_status_history.
-- =============================================================================
CREATE TABLE IF NOT EXISTS listing_status_history (
    id         SERIAL      PRIMARY KEY,
    listing_id UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by UUID        REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================================================
-- TABLE: notifications
-- Lightweight in-app notifications for offers, acceptances, etc.
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id                 SERIAL       PRIMARY KEY,
    user_id            UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type               VARCHAR(50)  NOT NULL,
    message            TEXT         NOT NULL,
    is_read            BOOLEAN      NOT NULL DEFAULT FALSE,
    related_listing_id UUID         REFERENCES listings(id) ON DELETE SET NULL,
    related_offer_id   UUID         REFERENCES offers(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
