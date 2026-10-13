# Second-Hand Student Marketplace

> **"Find what you need. Sell what you don't."**

A full-stack, student-focused second-hand marketplace that combines relational database design, full-text search, and semantic/vector search to provide a significantly better item discovery experience than generic marketplaces.

**DBMS Level 3 Academic Project** — demonstrates relational database design, normalization, transactions, triggers, views, indexes, and pgvector semantic search.

---

## Problem Statement

Generic marketplaces (OLX, Facebook Marketplace) have millions of listings but poor discovery for students. Students searching for a "scientific calculator for engineering exams" get unrelated results because keyword search misses synonyms and context.

This platform solves that by:
1. Structuring listings around student-relevant categories
2. Combining keyword search (PostgreSQL FTS) with semantic search (pgvector)
3. Extracting implicit filters from natural language queries

---

## Features

### Marketplace
- Browse listings with category/condition/price/location filters
- Create listings with image upload
- Edit and remove listings
- Listing detail page with image gallery

### Search
- **Keyword search** — PostgreSQL tsvector FTS with GIN index
- **Semantic search** — pgvector cosine similarity (OpenAI embeddings)
- **Hybrid ranking** — weighted formula combining both signals
- **Natural language filter extraction** — "under ₹800", "used", "calculator"

### User Features
- Register / Login / Logout (JWT, HTTP-only cookies)
- Wishlist (add/remove, duplicate prevention)
- Offers (create, accept, reject, withdraw)
- Transaction history (purchases + sales)
- Profile management

### Admin
- User management (suspend/restore)
- Listing moderation (remove listings)
- Report review (Pending → Reviewing → Resolved/Dismissed)
- Analytics dashboard (stats, category breakdown, top sellers, charts)

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Routes (Route Handlers) |
| Database | PostgreSQL + pgvector |
| Auth | Custom JWT via `jose` (HTTP-only cookies) |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dim) |
| Validation | Zod |
| Testing | Vitest |

---

## Architecture

```
Browser
  └─► Next.js App (server-rendered pages + client components)
        └─► API Routes (Route Handlers)
              └─► Service Layer (lib/search/, lib/auth/, lib/db/)
                    └─► PostgreSQL + pgvector
```

Single monolith. No microservices. One database. Understandable and demonstrable.

---

## Database Design

- **12 tables** in 3NF
- **22 indexes** (B-tree, GIN for FTS, IVFFlat for vectors)
- **4 views** (available_listings, all_listings, marketplace_statistics, seller_summary, category_stats)
- **7 triggers** (auto-timestamps, prevent invalid offers, status history, FTS maintenance, auto-wishlist)
- **1 stored function** (`accept_offer()` — centerpiece transaction demonstration)

See [`docs/database-design.md`](docs/database-design.md) for full documentation.
See [`docs/er-diagram.md`](docs/er-diagram.md) for the ER diagram.

---

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- (Optional) OpenAI API key for semantic search

### 1. Clone and install

```bash
git clone <repo-url>
cd student-marketplace
```

Install dependencies using the lockfile exactly (requires npm 7+):

```bash
npm ci
```

> `npm ci` installs from `package-lock.json` without altering it. Use `npm install`
> only if you intentionally want to update resolved versions.

### 2. Configure environment

```bash
# macOS / Linux
cp .env.example .env.local

# Windows (PowerShell)
Copy-Item .env.example .env.local
```

Edit `.env.local` and fill in your values. The file already contains comments
explaining each variable. At minimum you must set:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/student_marketplace
AUTH_SECRET=<generate a random 32+ character string>
```

`OPENAI_API_KEY` is optional — the app falls back to keyword-only search when it
is absent. `NEXT_PUBLIC_APP_URL` defaults to `http://localhost:3000`.

Generate a secure `AUTH_SECRET`:

```bash
# Node.js (any platform)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32
```

### 3. Set up PostgreSQL

```bash
# Create the database
createdb student_marketplace
```

Install the pgvector extension if it is not already present:

```bash
# macOS (Homebrew)
brew install pgvector

# Ubuntu / Debian
sudo apt install postgresql-15-pgvector   # adjust version number as needed

# Windows
# See: https://github.com/pgvector/pgvector#windows
# Pre-built binaries are available at the link above for PostgreSQL 14–17.
```

### 4. Run migrations

```bash
npm run db:migrate
```

This runs all migrations in order:
- `001_schema.sql` — tables, constraints, CHECK constraints
- `002_indexes.sql` — all indexes including GIN and IVFFlat
- `003_views.sql` — 5 database views
- `004_triggers.sql` — 7 triggers
- `005_functions.sql` — `accept_offer()` stored function

### 5. Seed demo data

```bash
npm run db:seed
```

Creates:
- 2 admin accounts + 21 student accounts
- 44 realistic listings across all categories
- Offers, transactions, wishlists, reports

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Student | `student@example.com` | `student123` |
| Admin | `admin@example.com` | `admin123` |

---

## API Documentation

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create student account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current session |
| PATCH | `/api/auth/profile` | Update profile |
| GET | `/api/listings` | Browse listings (paginated) |
| POST | `/api/listings` | Create listing |
| GET | `/api/listings/[id]` | Get listing detail |
| PUT | `/api/listings/[id]` | Update listing |
| DELETE | `/api/listings/[id]` | Remove listing |
| POST | `/api/listings/[id]/embed` | Generate embedding |
| GET | `/api/search` | Hybrid search |
| GET | `/api/categories` | All categories |
| GET | `/api/wishlist` | Get wishlist |
| POST | `/api/wishlist` | Add to wishlist |
| DELETE | `/api/wishlist/[listingId]` | Remove from wishlist |
| GET | `/api/offers` | Get offers |
| POST | `/api/offers` | Create offer |
| PATCH | `/api/offers/[id]` | Accept/Reject/Withdraw offer |
| GET | `/api/transactions` | Transaction history |
| POST | `/api/reports` | Report a listing |
| POST | `/api/upload` | Upload listing image |
| GET | `/api/admin/analytics` | Admin analytics |
| GET | `/api/admin/reports` | All reports |
| PATCH | `/api/admin/reports/[id]` | Update report status |
| PATCH | `/api/admin/users/[id]` | Update user status |
| PATCH | `/api/admin/listings/[id]` | Admin moderate listing |

---

## Search Architecture

See [`docs/search-architecture.md`](docs/search-architecture.md) for detailed explanation.

**Hybrid scoring formula:**
```
final_score = 0.55 × semantic_score
            + 0.25 × keyword_score
            + 0.10 × category_score
            + 0.05 × price_score
            + 0.05 × recency_score
```

---

## DBMS Concepts Demonstrated

| Concept | Where |
|---|---|
| Normalization (3NF) | All tables — no repeating groups, no transitive deps |
| Primary Keys | UUID (gen_random_uuid()) or SERIAL on every table |
| Foreign Keys | All inter-table relationships |
| UNIQUE constraints | `users.email`, `wishlist_items`, `transactions.offer_id` |
| CHECK constraints | `price >= 0`, `status IN (...)`, `condition IN (...)`, `year BETWEEN 1 AND 6` |
| JOINs | Browse/search/admin pages query 3–5 tables |
| GROUP BY + HAVING | Analytics queries |
| Aggregate functions | COUNT, AVG, SUM, MIN, MAX in views + analytics |
| Subqueries | "listings with pending offers", correlated subqueries |
| Views | `available_listings_view`, `marketplace_statistics_view`, etc. |
| Indexes | 22 indexes: B-tree, GIN (FTS), IVFFlat (vectors) |
| Transactions | `accept_offer()` — BEGIN/FOR UPDATE/COMMIT/ROLLBACK |
| Triggers | T1–T7: timestamps, offer prevention, status history, FTS maintenance |
| Stored Functions | `accept_offer()`, `get_listing_with_details()`, `get_marketplace_stats()` |
| Full-Text Search | tsvector/tsquery, GIN index, ts_rank_cd |
| Vector Similarity Search | pgvector, cosine distance (`<=>`), IVFFlat index |

---

## Running Tests

```bash
npm run test          # run all tests once
npm run test:watch    # watch mode
```

85 tests across:
- Validation schemas
- JWT session logic
- Listing business rules
- Search filter extraction
- Ranking formula and weights
- Offer/transaction workflow

---

## Project Structure

```
app/
├── (auth)/          Login, Register pages
├── (marketplace)/   Home, Browse, Search, Listings, Wishlist, Offers, Transactions, Profile
├── admin/           Admin dashboard, Users, Listings, Reports, Analytics
└── api/             All API route handlers

lib/
├── auth/            JWT session, route protection, React context
├── db/              PostgreSQL pool, query helpers, typed query modules
├── embeddings/      OpenAI embedding generation
├── search/          Keyword, semantic, hybrid search, ranking, filter extraction
└── validation/      Zod schemas

database/
├── migrations/      001-005 SQL migration files
├── seed/            Demo data seed script
└── functions/       (additional SQL if needed)

docs/
├── er-diagram.md          Entity-relationship diagram
├── database-design.md     Full DB design documentation
├── search-architecture.md Search system architecture
└── sql-demo/
    └── demo-queries.sql   17 SQL demonstration queries
```

---

## Future Enhancements

The following features were out of scope for this academic project:

- **Student institutional verification** — verify `.edu` email addresses
- **Personalized recommendations** — collaborative filtering based on wishlist + browsing history
- **Real-time chat** — WebSocket-based buyer-seller messaging
- **Payment integration** — UPI/Razorpay payment gateway
- **Image similarity search** — find visually similar listings using image embeddings
- **Price trend prediction** — historical price data for categories
- **Campus pickup coordination** — map-based pickup point scheduling
- **Mobile app** — React Native client

---

## License

Academic project — not for production use.
