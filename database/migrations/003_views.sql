-- =============================================================================
-- Migration 003: Database Views
-- Second-Hand Student Marketplace
-- =============================================================================
-- Views are used:
--   1. In the application (API routes query views directly)
--   2. In the admin dashboard
--   3. To demonstrate JOIN + aggregate SQL in evaluation
-- =============================================================================

-- ---------------------------------------------------------------------------
-- VIEW: available_listings_view
-- Purpose: The primary view for the browse/search pages.
-- Joins listings with their seller, category, and primary image.
-- Only shows Available listings by default (filters are applied on top).
-- Demonstrates: JOIN across 4 tables, COALESCE, subquery
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW available_listings_view AS
SELECT
    l.id,
    l.seller_id,
    l.category_id,
    l.title,
    l.description,
    l.price,
    l.condition,
    l.location,
    l.status,
    l.searchable_text,
    l.embedding,
    l.created_at,
    l.updated_at,
    -- Seller information
    u.name          AS seller_name,
    u.email         AS seller_email,
    u.college       AS seller_college,
    -- Category information
    c.name          AS category_name,
    c.slug          AS category_slug,
    c.icon          AS category_icon,
    -- Parent category (for subcategories)
    pc.name         AS parent_category_name,
    pc.slug         AS parent_category_slug,
    -- Primary image (lowest display_order)
    (
        SELECT image_url
        FROM listing_images li
        WHERE li.listing_id = l.id
        ORDER BY li.display_order ASC
        LIMIT 1
    )               AS primary_image,
    -- Image count
    (
        SELECT COUNT(*)
        FROM listing_images li
        WHERE li.listing_id = l.id
    )::INTEGER       AS image_count
FROM listings l
INNER JOIN users      u  ON l.seller_id   = u.id
INNER JOIN categories c  ON l.category_id = c.id
LEFT JOIN  categories pc ON c.parent_id   = pc.id
WHERE l.status = 'Available';

-- ---------------------------------------------------------------------------
-- VIEW: all_listings_view
-- Same as available_listings_view but includes all statuses.
-- Used by admin moderation and seller's "My Listings" page.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW all_listings_view AS
SELECT
    l.id,
    l.seller_id,
    l.category_id,
    l.title,
    l.description,
    l.price,
    l.condition,
    l.location,
    l.status,
    l.searchable_text,
    l.embedding,
    l.created_at,
    l.updated_at,
    u.name          AS seller_name,
    u.email         AS seller_email,
    u.college       AS seller_college,
    c.name          AS category_name,
    c.slug          AS category_slug,
    c.icon          AS category_icon,
    pc.name         AS parent_category_name,
    (
        SELECT image_url
        FROM listing_images li
        WHERE li.listing_id = l.id
        ORDER BY li.display_order ASC
        LIMIT 1
    )               AS primary_image,
    (
        SELECT COUNT(*)
        FROM listing_images li
        WHERE li.listing_id = l.id
    )::INTEGER       AS image_count
FROM listings l
INNER JOIN users      u  ON l.seller_id   = u.id
INNER JOIN categories c  ON l.category_id = c.id
LEFT JOIN  categories pc ON c.parent_id   = pc.id;

-- ---------------------------------------------------------------------------
-- VIEW: marketplace_statistics_view
-- Purpose: Powers the admin analytics dashboard.
-- Demonstrates: COUNT, AVG, SUM, CASE, aggregate functions, GROUP BY concepts
-- used indirectly through scalar subqueries.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW marketplace_statistics_view AS
SELECT
    -- User statistics
    (SELECT COUNT(*) FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'student'))::INTEGER
                                                    AS total_students,
    (SELECT COUNT(*) FROM users WHERE status = 'active')::INTEGER
                                                    AS active_users,
    (SELECT COUNT(*) FROM users WHERE status = 'suspended')::INTEGER
                                                    AS suspended_users,

    -- Listing statistics
    (SELECT COUNT(*) FROM listings)::INTEGER         AS total_listings,
    (SELECT COUNT(*) FROM listings WHERE status = 'Available')::INTEGER
                                                    AS available_listings,
    (SELECT COUNT(*) FROM listings WHERE status = 'Sold')::INTEGER
                                                    AS sold_listings,
    (SELECT COUNT(*) FROM listings WHERE status = 'Reserved')::INTEGER
                                                    AS reserved_listings,
    (SELECT COUNT(*) FROM listings WHERE status = 'Removed')::INTEGER
                                                    AS removed_listings,

    -- Average listing price (Available listings only)
    COALESCE(
        (SELECT ROUND(AVG(price), 2) FROM listings WHERE status = 'Available'),
        0
    )                                               AS avg_listing_price,

    -- Offer statistics
    (SELECT COUNT(*) FROM offers WHERE status = 'Pending')::INTEGER
                                                    AS pending_offers,
    (SELECT COUNT(*) FROM offers WHERE status = 'Accepted')::INTEGER
                                                    AS accepted_offers,

    -- Transaction statistics
    (SELECT COUNT(*) FROM transactions)::INTEGER    AS total_transactions,
    COALESCE(
        (SELECT SUM(final_price) FROM transactions WHERE transaction_status = 'Completed'),
        0
    )                                               AS total_transaction_value,

    -- Report statistics
    (SELECT COUNT(*) FROM reports WHERE status = 'Pending')::INTEGER
                                                    AS pending_reports,
    (SELECT COUNT(*) FROM reports)::INTEGER         AS total_reports;

-- ---------------------------------------------------------------------------
-- VIEW: seller_listing_summary_view
-- Purpose: Per-seller statistics. Used in admin user management and profile.
-- Demonstrates: GROUP BY, COUNT, SUM, HAVING (applied as a filter on top)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW seller_listing_summary_view AS
SELECT
    u.id                                                    AS seller_id,
    u.name                                                  AS seller_name,
    u.email                                                 AS seller_email,
    u.college                                               AS seller_college,
    u.status                                                AS seller_status,
    u.created_at                                            AS member_since,
    COUNT(l.id)::INTEGER                                    AS total_listings,
    COUNT(l.id) FILTER (WHERE l.status = 'Available')::INTEGER
                                                            AS active_listings,
    COUNT(l.id) FILTER (WHERE l.status = 'Sold')::INTEGER   AS sold_listings,
    COUNT(l.id) FILTER (WHERE l.status = 'Reserved')::INTEGER
                                                            AS reserved_listings,
    COALESCE(SUM(t.final_price), 0)                         AS total_revenue,
    COUNT(DISTINCT t.id)::INTEGER                           AS completed_sales
FROM users u
LEFT JOIN listings     l ON l.seller_id = u.id
LEFT JOIN transactions t ON t.seller_id = u.id AND t.transaction_status = 'Completed'
WHERE u.role_id = (SELECT id FROM roles WHERE name = 'student')
GROUP BY u.id, u.name, u.email, u.college, u.status, u.created_at;

-- ---------------------------------------------------------------------------
-- VIEW: category_stats_view
-- Purpose: Most popular categories for admin analytics and home page.
-- Demonstrates: JOIN, GROUP BY, ORDER BY, COUNT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW category_stats_view AS
SELECT
    c.id                                                        AS category_id,
    c.name                                                      AS category_name,
    c.slug                                                      AS category_slug,
    c.icon                                                      AS category_icon,
    COUNT(l.id)::INTEGER                                        AS total_listings,
    COUNT(l.id) FILTER (WHERE l.status = 'Available')::INTEGER  AS available_listings,
    COUNT(l.id) FILTER (WHERE l.status = 'Sold')::INTEGER       AS sold_listings,
    COALESCE(ROUND(AVG(l.price) FILTER (WHERE l.status = 'Available'), 2), 0)
                                                                AS avg_price
FROM categories c
LEFT JOIN listings l ON l.category_id = c.id
WHERE c.parent_id IS NULL  -- top-level categories only
GROUP BY c.id, c.name, c.slug, c.icon
ORDER BY total_listings DESC;
