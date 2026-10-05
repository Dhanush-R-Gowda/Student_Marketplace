-- =============================================================================
-- Migration 005: Stored Functions / Procedures
-- Second-Hand Student Marketplace
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FUNCTION: accept_offer(p_offer_id, p_seller_id)
--
-- This is the CENTERPIECE DBMS demonstration function.
-- It encapsulates the entire offer-acceptance workflow inside a single
-- database function, which the application calls inside a transaction.
--
-- The function demonstrates:
--   - Explicit locking (SELECT ... FOR UPDATE)
--   - State verification before mutation
--   - Atomic multi-table update
--   - Business rule enforcement (listing state, offer state)
--   - Transaction rollback on violation
--
-- Workflow:
--   1. Lock the listing row (prevents concurrent accept_offer calls)
--   2. Verify listing is still Available or Reserved
--   3. Lock and verify the offer is still Pending
--   4. Verify the caller is the listing's seller
--   5. Accept the offer (update offers.status = 'Accepted')
--   6. Reject all other Pending offers on the same listing
--   7. Mark the listing as Sold
--   8. Insert a transaction record
--   9. Create notifications for buyer and rejected buyers
--   Return the new transaction ID
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION accept_offer(
    p_offer_id  UUID,
    p_seller_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_listing_id    UUID;
    v_buyer_id      UUID;
    v_amount        NUMERIC(12,2);
    v_listing_status VARCHAR(20);
    v_listing_seller UUID;
    v_transaction_id UUID;
BEGIN
    -- Step 1: Lock the offer row and read data
    SELECT listing_id, buyer_id, amount
    INTO v_listing_id, v_buyer_id, v_amount
    FROM offers
    WHERE id = p_offer_id AND status = 'Pending'
    FOR UPDATE;  -- row-level lock

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer % is not available (not found or not Pending)', p_offer_id
            USING ERRCODE = 'no_data_found';
    END IF;

    -- Step 2: Lock the listing row and verify state
    SELECT status, seller_id
    INTO v_listing_status, v_listing_seller
    FROM listings
    WHERE id = v_listing_id
    FOR UPDATE;  -- row-level lock

    IF v_listing_status NOT IN ('Available', 'Reserved') THEN
        RAISE EXCEPTION 'Listing is no longer available (status: %)', v_listing_status
            USING ERRCODE = 'check_violation';
    END IF;

    -- Step 3: Verify the caller is the seller
    IF v_listing_seller != p_seller_id THEN
        RAISE EXCEPTION 'Only the seller can accept offers on this listing'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Step 4: Accept this offer
    UPDATE offers
    SET status = 'Accepted', updated_at = NOW()
    WHERE id = p_offer_id;

    -- Step 5: Reject all other Pending offers on this listing
    UPDATE offers
    SET status = 'Rejected', updated_at = NOW()
    WHERE listing_id = v_listing_id
      AND id != p_offer_id
      AND status = 'Pending';

    -- Step 6: Mark listing as Sold
    -- Note: T5_record_listing_status_history trigger fires automatically here
    UPDATE listings
    SET status = 'Sold', updated_at = NOW()
    WHERE id = v_listing_id;

    -- Step 7: Create transaction record
    INSERT INTO transactions (
        listing_id, buyer_id, seller_id, offer_id,
        final_price, transaction_status, completed_at
    ) VALUES (
        v_listing_id, v_buyer_id, p_seller_id, p_offer_id,
        v_amount, 'Completed', NOW()
    )
    RETURNING id INTO v_transaction_id;

    -- Step 8: Notify the buyer that their offer was accepted
    INSERT INTO notifications (user_id, type, message, related_listing_id, related_offer_id)
    SELECT
        v_buyer_id,
        'offer_accepted',
        'Your offer of ₹' || v_amount || ' was accepted! Contact the seller to arrange pickup.',
        v_listing_id,
        p_offer_id;

    -- Step 9: Notify buyers whose offers were rejected
    INSERT INTO notifications (user_id, type, message, related_listing_id, related_offer_id)
    SELECT
        o.buyer_id,
        'offer_rejected',
        'Unfortunately your offer was not selected for this listing.',
        v_listing_id,
        o.id
    FROM offers o
    WHERE o.listing_id = v_listing_id
      AND o.id != p_offer_id
      AND o.status = 'Rejected'
      AND o.buyer_id != v_buyer_id;  -- don't double-notify

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- FUNCTION: get_listing_with_details(p_listing_id)
-- Returns a single listing with all joined data as a JSON object.
-- Used by the listing detail page API.
-- Demonstrates: JSON aggregation, multiple JOINs, subqueries
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_listing_with_details(p_listing_id UUID)
RETURNS TABLE (
    id               UUID,
    seller_id        UUID,
    category_id      INTEGER,
    title            VARCHAR,
    description      TEXT,
    price            NUMERIC,
    condition        VARCHAR,
    location         VARCHAR,
    status           VARCHAR,
    created_at       TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ,
    seller_name      VARCHAR,
    seller_email     VARCHAR,
    seller_college   VARCHAR,
    category_name    VARCHAR,
    category_slug    VARCHAR,
    images           JSON,
    offer_count      INTEGER
) AS $$
BEGIN
    RETURN QUERY
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
        l.created_at,
        l.updated_at,
        u.name          AS seller_name,
        u.email         AS seller_email,
        u.college       AS seller_college,
        c.name          AS category_name,
        c.slug          AS category_slug,
        -- Images as JSON array
        COALESCE(
            (
                SELECT json_agg(
                    json_build_object(
                        'id', li.id,
                        'image_url', li.image_url,
                        'display_order', li.display_order
                    ) ORDER BY li.display_order
                )
                FROM listing_images li
                WHERE li.listing_id = l.id
            ),
            '[]'::JSON
        )               AS images,
        -- Pending offer count (for seller to see interest)
        (
            SELECT COUNT(*)::INTEGER
            FROM offers o
            WHERE o.listing_id = l.id AND o.status = 'Pending'
        )               AS offer_count
    FROM listings l
    INNER JOIN users      u ON l.seller_id   = u.id
    INNER JOIN categories c ON l.category_id = c.id
    WHERE l.id = p_listing_id;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- FUNCTION: get_marketplace_stats()
-- Returns a single row of aggregated marketplace metrics.
-- Used by admin dashboard.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_marketplace_stats()
RETURNS TABLE (
    total_users          INTEGER,
    active_users         INTEGER,
    total_listings       INTEGER,
    available_listings   INTEGER,
    sold_listings        INTEGER,
    pending_offers       INTEGER,
    completed_transactions INTEGER,
    pending_reports      INTEGER,
    avg_listing_price    NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM marketplace_statistics_view
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
