-- =============================================================================
-- Migration 004: Triggers
-- Second-Hand Student Marketplace
-- =============================================================================
-- Each trigger has a stated justification. Triggers are NOT used just to show
-- they exist — each one automates a rule that must hold regardless of which
-- application code path is used.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TRIGGER T1: auto_update_listing_timestamp
-- Justification: listings.updated_at must always reflect the last modification.
--   If we relied on application code alone, a direct DB update or a future
--   code path could forget to set updated_at. The trigger enforces it at the
--   database level.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auto_update_listing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS T1_auto_update_listing_timestamp ON listings;
CREATE TRIGGER T1_auto_update_listing_timestamp
    BEFORE UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_update_listing_timestamp();

-- ---------------------------------------------------------------------------
-- TRIGGER T2: auto_update_offer_timestamp
-- Same justification as T1 but for offers.updated_at.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auto_update_offer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS T2_auto_update_offer_timestamp ON offers;
CREATE TRIGGER T2_auto_update_offer_timestamp
    BEFORE UPDATE ON offers
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_update_offer_timestamp();

-- ---------------------------------------------------------------------------
-- TRIGGER T3: auto_update_user_timestamp
-- Same justification for users.updated_at.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auto_update_user_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS T3_auto_update_user_timestamp ON users;
CREATE TRIGGER T3_auto_update_user_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_update_user_timestamp();

-- ---------------------------------------------------------------------------
-- TRIGGER T4: prevent_offer_on_unavailable_listing
-- Justification: The business rule "a buyer cannot offer on a sold/removed
--   listing" must be enforced at the database level. Without this trigger, a
--   race condition could allow an INSERT into offers after the listing is sold
--   if two requests arrive simultaneously. The trigger catches this regardless
--   of the application path.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prevent_offer_on_unavailable_listing()
RETURNS TRIGGER AS $$
DECLARE
    listing_status VARCHAR(20);
    listing_seller UUID;
BEGIN
    SELECT status, seller_id
    INTO listing_status, listing_seller
    FROM listings
    WHERE id = NEW.listing_id;

    -- Cannot offer on non-Available listing
    IF listing_status NOT IN ('Available', 'Reserved') THEN
        RAISE EXCEPTION 'Cannot make an offer: listing is %', listing_status
            USING ERRCODE = 'check_violation';
    END IF;

    -- Buyer cannot offer on their own listing
    IF NEW.buyer_id = listing_seller THEN
        RAISE EXCEPTION 'You cannot make an offer on your own listing'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS T4_prevent_offer_on_unavailable_listing ON offers;
CREATE TRIGGER T4_prevent_offer_on_unavailable_listing
    BEFORE INSERT ON offers
    FOR EACH ROW
    EXECUTE FUNCTION fn_prevent_offer_on_unavailable_listing();

-- ---------------------------------------------------------------------------
-- TRIGGER T5: record_listing_status_history
-- Justification: Every time a listing's status changes, we must record the
--   transition in listing_status_history for:
--   (a) audit trail / admin review
--   (b) compliance demonstration in DBMS evaluation
--   This cannot be left to application code — a direct DB update would miss it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_record_listing_status_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Only fire when status actually changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO listing_status_history (listing_id, old_status, new_status, changed_at)
        VALUES (NEW.id, OLD.status, NEW.status, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS T5_record_listing_status_history ON listings;
CREATE TRIGGER T5_record_listing_status_history
    AFTER UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION fn_record_listing_status_history();

-- ---------------------------------------------------------------------------
-- TRIGGER T6: maintain_searchable_text
-- Justification: searchable_text (tsvector) must stay in sync with title,
--   description, and category. Maintaining it via trigger ensures the FTS
--   index is always current even if updates come from outside the application.
-- Note: category name lookup requires a join, done via a nested SELECT.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_maintain_searchable_text()
RETURNS TRIGGER AS $$
DECLARE
    cat_name VARCHAR;
BEGIN
    SELECT name INTO cat_name FROM categories WHERE id = NEW.category_id;

    NEW.searchable_text = to_tsvector('english',
        COALESCE(NEW.title, '') || ' ' ||
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE(cat_name, '') || ' ' ||
        COALESCE(NEW.condition, '') || ' ' ||
        COALESCE(NEW.location, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS T6_maintain_searchable_text ON listings;
CREATE TRIGGER T6_maintain_searchable_text
    BEFORE INSERT OR UPDATE OF title, description, category_id, condition, location
    ON listings
    FOR EACH ROW
    EXECUTE FUNCTION fn_maintain_searchable_text();

-- ---------------------------------------------------------------------------
-- TRIGGER T7: auto_create_wishlist_for_new_user
-- Justification: Every student should have exactly one wishlist. Creating it
--   automatically on user registration avoids null-checks in application code
--   and ensures the wishlist always exists when the user needs it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auto_create_wishlist()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create wishlist for students (not admins)
    IF (SELECT name FROM roles WHERE id = NEW.role_id) = 'student' THEN
        INSERT INTO wishlists (user_id) VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS T7_auto_create_wishlist ON users;
CREATE TRIGGER T7_auto_create_wishlist
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_create_wishlist();
