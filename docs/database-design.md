# Database Design — Second-Hand Student Marketplace

## Normalization

### Why 3NF?

The schema is designed to Third Normal Form (3NF):

1. **1NF**: Every table has a primary key. No repeating groups. No comma-separated values.
   - Categories are stored in a separate `categories` table (not as a text field in `listings`).
   - Multiple images use `listing_images` (not an array column).

2. **2NF**: No partial dependencies.
   - All tables use single-column surrogate PKs (UUID or SERIAL), so no partial dependency is possible.

3. **3NF**: No transitive dependencies.
   - `listings` stores `category_id` (FK), not `category_name`. Category name is resolved via JOIN.
   - `users.role_id` (FK to `roles`), not `role_name` inline.
   - `transactions` stores `buyer_id` and `seller_id` as FKs — not inline name strings — to avoid update anomalies.

### Justified Denormalization

One deliberate denormalization exists:

- `listings.searchable_text` (tsvector) — a materialized concatenation of title + description + category + condition + location.
  - **Justification**: Full-text search requires a tsvector column with a GIN index. Recomputing this on every query would be expensive. The column is maintained automatically by **Trigger T6** (`T6_maintain_searchable_text`) on every INSERT/UPDATE — not by application code. This is a read-optimization, not data duplication.

---

## Tables

### `roles`
Lookup table. Keeps role logic database-managed.

### `users`
- `status` CHECK: `active | suspended | deactivated`
- `year` CHECK: `BETWEEN 1 AND 6`
- `email` UNIQUE — enforced at DB level

### `categories`
- Self-referencing `parent_id` for subcategory hierarchy.
- Slug column (`UNIQUE`) allows URL-friendly category filtering.

### `listings`
- `price` CHECK: `>= 0` — enforces non-negative price at DB level
- `condition` CHECK: enum values
- `status` CHECK: enum values
- `embedding VECTOR(1536)` — pgvector column for semantic search

### `listing_images`
- `ON DELETE CASCADE` — removing a listing removes all images

### `wishlists` + `wishlist_items`
- UNIQUE constraint on `(wishlist_id, listing_id)` — prevents duplicate wishlist entries at DB level

### `offers`
- EXCLUDE constraint: `(listing_id WITH =, buyer_id WITH =) WHERE (status = 'Pending')` — prevents a buyer from having two pending offers on the same listing simultaneously
- Trigger T4 prevents offers on sold/removed listings

### `transactions`
- `UNIQUE(offer_id)` — one transaction per accepted offer
- `ON DELETE RESTRICT` on listing/buyer/seller FKs — transactions cannot be orphaned

### `reports`
- UNIQUE `(reporter_id, listing_id)` — prevents duplicate reports from same user

---

## Indexes

| Index | Type | Justification |
|---|---|---|
| `users(email)` | B-tree UNIQUE | Login lookup |
| `listings(seller_id)` | B-tree | "My Listings" page |
| `listings(category_id)` | B-tree | Category browse |
| `listings(status)` | B-tree | Available filter |
| `listings(price)` | B-tree | Price sort/filter |
| `listings(created_at DESC)` | B-tree | Newest first |
| `listings(status, created_at)` | Composite | Browse available newest |
| `listings(searchable_text)` | GIN | Full-text search |
| `listings(embedding)` | IVFFlat | Vector similarity search |
| `offers(listing_id)` | B-tree | Seller offer view |
| `offers(buyer_id)` | B-tree | Buyer offer history |
| `transactions(buyer_id)` | B-tree | Purchase history |
| `transactions(seller_id)` | B-tree | Sales history |

---

## Triggers

| Trigger | Event | Justification |
|---|---|---|
| T1 `auto_update_listing_timestamp` | BEFORE UPDATE | `updated_at` always reflects last change |
| T2 `auto_update_offer_timestamp` | BEFORE UPDATE | Same for offers |
| T3 `auto_update_user_timestamp` | BEFORE UPDATE | Same for users |
| T4 `prevent_offer_on_unavailable_listing` | BEFORE INSERT on offers | Business rule: no offers on Sold/Removed; no self-offers |
| T5 `record_listing_status_history` | AFTER UPDATE on listings | Audit trail for all status changes |
| T6 `maintain_searchable_text` | BEFORE INSERT/UPDATE on listings | Keeps FTS tsvector in sync |
| T7 `auto_create_wishlist_for_new_user` | AFTER INSERT on users | Every student gets a wishlist automatically |

---

## Views

### `available_listings_view`
Joins listings + seller + category + primary image for the browse/search pages. Filters `status = 'Available'`.

### `all_listings_view`
Same join but includes all statuses — used by admin moderation and "My Listings".

### `marketplace_statistics_view`
Scalar subqueries for counts/averages — used by admin dashboard.

### `seller_listing_summary_view`
`GROUP BY seller` — counts, revenue — demonstrates GROUP BY + aggregate functions.

### `category_stats_view`
`GROUP BY category` — listing counts, sold counts, avg price.

---

## Stored Function: `accept_offer(p_offer_id, p_seller_id)`

The centerpiece DBMS demonstration. Full transaction:

```sql
BEGIN
  SELECT ... FOR UPDATE  -- lock offer row
  SELECT ... FOR UPDATE  -- lock listing row
  -- Verify state
  UPDATE offers SET status = 'Accepted'  -- accept this offer
  UPDATE offers SET status = 'Rejected'  -- reject competing offers
  UPDATE listings SET status = 'Sold'    -- triggers T5 for history
  INSERT INTO transactions (...)         -- create transaction record
  INSERT INTO notifications (...)        -- notify buyer + rejected buyers
COMMIT
-- On any error: ROLLBACK (no inconsistent state)
```
