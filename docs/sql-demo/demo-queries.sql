-- =============================================================================
-- SQL DEMONSTRATION QUERIES
-- Second-Hand Student Marketplace — DBMS Level 3
-- =============================================================================
-- These queries demonstrate every major DBMS concept used in the project.
-- Run them against a populated database (after running: npx tsx database/seed/seed.ts)
-- =============================================================================


-- =============================================================================
-- 1. BASIC SELECT
-- =============================================================================

-- All available listings sorted by newest
SELECT id, title, price, condition, location, status, created_at
FROM listings
WHERE status = 'Available'
ORDER BY created_at DESC
LIMIT 10;


-- =============================================================================
-- 2. JOIN — listing with seller and category
-- =============================================================================

SELECT
    l.title,
    l.price,
    l.condition,
    l.location,
    u.name  AS seller_name,
    u.email AS seller_email,
    c.name  AS category_name
FROM listings l
INNER JOIN users      u ON l.seller_id   = u.id
INNER JOIN categories c ON l.category_id = c.id
WHERE l.status = 'Available'
ORDER BY l.created_at DESC
LIMIT 10;


-- =============================================================================
-- 3. GROUP BY — listings per category
-- =============================================================================

SELECT
    c.name                  AS category,
    COUNT(l.id)             AS total_listings,
    COUNT(l.id) FILTER (WHERE l.status = 'Available') AS available,
    COUNT(l.id) FILTER (WHERE l.status = 'Sold')      AS sold
FROM categories c
LEFT JOIN listings l ON l.category_id = c.id
GROUP BY c.id, c.name
ORDER BY total_listings DESC;


-- =============================================================================
-- 4. HAVING — categories with more than 3 listings
-- =============================================================================

SELECT
    c.name         AS category,
    COUNT(l.id)    AS listing_count
FROM categories c
INNER JOIN listings l ON l.category_id = c.id
GROUP BY c.id, c.name
HAVING COUNT(l.id) > 3
ORDER BY listing_count DESC;


-- =============================================================================
-- 5. ORDER BY — price sort
-- =============================================================================

SELECT title, price, condition, location
FROM listings
WHERE status = 'Available'
ORDER BY price ASC
LIMIT 10;


-- =============================================================================
-- 6. AGGREGATE FUNCTIONS
-- =============================================================================

SELECT
    COUNT(*)                                 AS total_listings,
    COUNT(*) FILTER (WHERE status = 'Available') AS available,
    COUNT(*) FILTER (WHERE status = 'Sold')      AS sold,
    ROUND(AVG(price), 2)                     AS avg_price,
    MIN(price)                               AS min_price,
    MAX(price)                               AS max_price,
    SUM(price) FILTER (WHERE status = 'Sold')    AS total_sold_value
FROM listings;


-- =============================================================================
-- 7. SUBQUERY — listings with at least one pending offer
-- =============================================================================

SELECT title, price, status
FROM listings
WHERE id IN (
    SELECT DISTINCT listing_id
    FROM offers
    WHERE status = 'Pending'
)
ORDER BY created_at DESC;


-- Correlated subquery: listings + pending offer count
SELECT
    l.title,
    l.price,
    (
        SELECT COUNT(*)
        FROM offers o
        WHERE o.listing_id = l.id AND o.status = 'Pending'
    ) AS pending_offers
FROM listings l
WHERE l.status = 'Available'
ORDER BY pending_offers DESC, l.created_at DESC
LIMIT 10;


-- =============================================================================
-- 8. VIEWS — using the pre-built views
-- =============================================================================

-- Browse available listings with all joined data
SELECT id, title, price, condition, seller_name, category_name, primary_image
FROM available_listings_view
ORDER BY created_at DESC
LIMIT 10;

-- Marketplace statistics (single-row aggregate view)
SELECT * FROM marketplace_statistics_view;

-- Seller performance summary
SELECT
    seller_name,
    total_listings,
    active_listings,
    sold_listings,
    total_revenue
FROM seller_listing_summary_view
WHERE completed_sales > 0
ORDER BY total_revenue DESC
LIMIT 5;

-- Category statistics
SELECT * FROM category_stats_view LIMIT 10;


-- =============================================================================
-- 9. INDEXES — demonstrate index usage with EXPLAIN
-- =============================================================================

-- This query uses idx_listings_status (B-tree)
EXPLAIN ANALYZE
SELECT title, price FROM listings WHERE status = 'Available';

-- This query uses idx_listings_fts (GIN)
EXPLAIN ANALYZE
SELECT title FROM listings
WHERE searchable_text @@ websearch_to_tsquery('english', 'calculator engineering');

-- This query uses idx_offers_listing_id (B-tree)
EXPLAIN ANALYZE
SELECT * FROM offers WHERE listing_id = (SELECT id FROM listings LIMIT 1);


-- =============================================================================
-- 10. TRANSACTION — manual demonstration (simulates accept_offer)
-- =============================================================================

-- Demonstrate explicit transaction with rollback
BEGIN;

  -- Step 1: Lock a listing
  SELECT id, status FROM listings WHERE status = 'Available' LIMIT 1 FOR UPDATE;

  -- Step 2: Check state (would abort if already sold)
  -- In a real scenario: verify offer is Pending

  -- Step 3: Update offer (simulate)
  -- UPDATE offers SET status = 'Accepted' WHERE id = '<offer_id>';

  -- Step 4: Reject competing offers
  -- UPDATE offers SET status = 'Rejected' WHERE listing_id = '<lid>' AND status = 'Pending';

  -- Step 5: Mark listing sold
  -- UPDATE listings SET status = 'Sold' WHERE id = '<lid>';

  -- Step 6: Insert transaction
  -- INSERT INTO transactions (...) VALUES (...);

ROLLBACK; -- Rollback since this is a demo


-- =============================================================================
-- 11. ROLLBACK — error handling
-- =============================================================================

BEGIN;
  -- Attempt to insert an offer with a negative amount
  -- This will fail due to CHECK constraint (amount >= 0)
  INSERT INTO offers (listing_id, buyer_id, amount)
  SELECT id, seller_id, -100
  FROM listings LIMIT 1;
  -- PostgreSQL raises: ERROR: new row for relation "offers" violates check constraint
ROLLBACK;
-- After rollback: database state is unchanged


-- =============================================================================
-- 12. TRIGGERS — verify trigger execution
-- =============================================================================

-- Test T1: updated_at auto-update
-- (update a listing and check updated_at changes)
UPDATE listings SET price = price + 1 WHERE id = (SELECT id FROM listings LIMIT 1);
SELECT id, price, updated_at FROM listings ORDER BY updated_at DESC LIMIT 1;

-- Test T5: Status history recorded
UPDATE listings SET status = 'Reserved' WHERE id = (SELECT id FROM listings WHERE status = 'Available' LIMIT 1);
SELECT * FROM listing_status_history ORDER BY changed_at DESC LIMIT 5;

-- Test T4: Trigger blocks offer on sold listing
-- (uncomment to test — will raise exception)
-- INSERT INTO offers (listing_id, buyer_id, amount)
-- SELECT id, (SELECT id FROM users WHERE role_id = 1 LIMIT 1), 100
-- FROM listings WHERE status = 'Sold' LIMIT 1;


-- =============================================================================
-- 13. STORED FUNCTION — accept_offer()
-- =============================================================================

-- The accept_offer() function encapsulates the full transaction:
-- BEGIN → lock → verify → accept → reject others → sold → transaction → COMMIT
-- Usage (replace with real UUIDs from your data):
-- SELECT accept_offer('<offer_id_uuid>', '<seller_id_uuid>');

-- Check the result after calling accept_offer():
SELECT
    o.status AS offer_status,
    l.status AS listing_status,
    t.id     AS transaction_id,
    t.final_price
FROM offers o
INNER JOIN listings     l ON o.listing_id = l.id
LEFT  JOIN transactions t ON t.offer_id  = o.id
WHERE o.status = 'Accepted'
ORDER BY t.created_at DESC
LIMIT 5;


-- =============================================================================
-- 14. CONSTRAINTS DEMONSTRATION
-- =============================================================================

-- UNIQUE constraint: email uniqueness
-- INSERT INTO users (role_id, name, email, password_hash) VALUES (1, 'Test', 'student@example.com', 'hash');
-- ERROR: duplicate key value violates unique constraint "users_email_key"

-- CHECK constraint: price cannot be negative
-- INSERT INTO listings (..., price, ...) VALUES (..., -100, ...);
-- ERROR: new row violates check constraint "listings_price_check"

-- CHECK constraint: valid condition enum
-- INSERT INTO listings (..., condition, ...) VALUES (..., 'Excellent', ...);
-- ERROR: new row violates check constraint "listings_condition_check"

-- UNIQUE constraint: one wishlist per user
-- INSERT INTO wishlists (user_id) VALUES ('<existing_user_id>');
-- ERROR: duplicate key value violates unique constraint "wishlists_user_id_key"


-- =============================================================================
-- 15. VECTOR SIMILARITY SEARCH (pgvector)
-- =============================================================================

-- Find semantically similar listings using cosine distance
-- (replace the vector with a real 1536-dim embedding)
-- The <=> operator is the cosine distance operator from pgvector

-- Example: find listings similar to a query embedding
-- SELECT
--     title,
--     price,
--     condition,
--     1 - (embedding <=> '[0.1, 0.2, ...]'::vector) AS similarity
-- FROM listings
-- WHERE embedding IS NOT NULL
--   AND status = 'Available'
-- ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
-- LIMIT 10;

-- Count listings that have embeddings vs. those that don't
SELECT
    COUNT(*)                              AS total_listings,
    COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS with_embedding,
    COUNT(*) FILTER (WHERE embedding IS NULL)     AS without_embedding
FROM listings;


-- =============================================================================
-- 16. FULL-TEXT SEARCH (tsvector / GIN index)
-- =============================================================================

-- Basic keyword search
SELECT title, ts_rank_cd(searchable_text, q) AS rank
FROM listings, websearch_to_tsquery('english', 'calculator engineering') q
WHERE searchable_text @@ q
ORDER BY rank DESC;

-- Check what tsvector content looks like for a listing
SELECT title, searchable_text FROM listings LIMIT 3;


-- =============================================================================
-- 17. WINDOW FUNCTIONS (bonus demonstration)
-- =============================================================================

-- Rank sellers by number of listings (DENSE_RANK)
SELECT
    u.name                                                AS seller,
    COUNT(l.id)                                           AS listing_count,
    DENSE_RANK() OVER (ORDER BY COUNT(l.id) DESC)         AS rank
FROM users u
INNER JOIN listings l ON l.seller_id = u.id
GROUP BY u.id, u.name
ORDER BY rank;

-- Running total of transactions by date
SELECT
    DATE(completed_at)                                        AS date,
    COUNT(*)                                                  AS daily_transactions,
    SUM(COUNT(*)) OVER (ORDER BY DATE(completed_at))          AS cumulative_transactions
FROM transactions
WHERE transaction_status = 'Completed'
GROUP BY DATE(completed_at)
ORDER BY date;
