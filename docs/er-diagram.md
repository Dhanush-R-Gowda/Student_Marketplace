# ER Diagram — Second-Hand Student Marketplace

## Entities and Relationships

```
┌────────┐        ┌───────┐        ┌──────────────┐
│ roles  │1──────*│ users │1──────*│   listings   │
└────────┘        └───────┘        └──────────────┘
                      │                    │
                      │                    │ 1
                      │              ┌─────┴──────────┐
                      │              │                │
                      │          ┌───▼────┐     ┌────▼────────────┐
                      │          │ offers │     │ listing_images  │
                      │          └───┬────┘     └─────────────────┘
                      │              │ 1
                      │         ┌────▼────────┐
                      │         │transactions │
                      │         └─────────────┘
                      │
              ┌───────┴────────┐
              │                │
         ┌────▼────┐      ┌────▼──────────┐
         │wishlists│*────*│wishlist_items │
         └─────────┘      └───────────────┘
                                │
                           ┌────▼────┐
                           │listings │ (FK)
                           └─────────┘

┌──────────┐1──────*┌──────────┐
│categories│        │ listings │
└──────────┘        └──────────┘
     │ (self-ref parent_id)
     └──────────────────────────►

┌────────┐1──────*┌─────────┐
│ users  │        │ reports │
└────────┘        └─────────┘
                       │FK listing_id
                  ┌────▼────┐
                  │listings │
                  └─────────┘

┌────────┐1──────*┌──────────────────────┐
│listings│        │listing_status_history│
└────────┘        └──────────────────────┘

┌────────┐1──────*┌───────────────┐
│ users  │        │ notifications │
└────────┘        └───────────────┘
```

## Cardinalities

| Entity A     | Relationship        | Entity B              |
|--------------|---------------------|-----------------------|
| roles        | 1 to many           | users                 |
| users        | 1 to many (seller)  | listings              |
| categories   | 1 to many           | listings              |
| categories   | 0..1 to many (self) | categories (sub)      |
| listings     | 1 to many           | listing_images        |
| listings     | 1 to many           | offers                |
| listings     | 1 to many           | reports               |
| listings     | 1 to many           | listing_status_history|
| users        | 1 to 1              | wishlists             |
| wishlists    | many to many        | listings (via items)  |
| offers       | 0..1 to 1           | transactions          |
| users        | 1 to many           | notifications         |

## Primary Keys

All tables use either `UUID` (gen_random_uuid()) or `SERIAL` as their primary key.

## Foreign Keys

- `users.role_id` → `roles.id`
- `listings.seller_id` → `users.id`
- `listings.category_id` → `categories.id`
- `categories.parent_id` → `categories.id` (self-ref, nullable)
- `listing_images.listing_id` → `listings.id` (CASCADE DELETE)
- `wishlists.user_id` → `users.id` (CASCADE DELETE)
- `wishlist_items.wishlist_id` → `wishlists.id` (CASCADE DELETE)
- `wishlist_items.listing_id` → `listings.id` (CASCADE DELETE)
- `offers.listing_id` → `listings.id` (CASCADE DELETE)
- `offers.buyer_id` → `users.id` (CASCADE DELETE)
- `transactions.listing_id` → `listings.id` (RESTRICT)
- `transactions.buyer_id` → `users.id` (RESTRICT)
- `transactions.seller_id` → `users.id` (RESTRICT)
- `transactions.offer_id` → `offers.id` (RESTRICT)
- `reports.reporter_id` → `users.id` (CASCADE DELETE)
- `reports.listing_id` → `listings.id` (CASCADE DELETE)
- `reports.reviewed_by` → `users.id` (SET NULL)
- `listing_status_history.listing_id` → `listings.id` (CASCADE DELETE)
- `notifications.user_id` → `users.id` (CASCADE DELETE)
