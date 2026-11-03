# NationX Shared Delivery & Logistics — System Architecture

**Project 03 — Shared Delivery Coordination System**  
*Document Version: 2.0 (Official Supabase & Monorepo Specification)*

---

## 1. Executive Summary & Architectural Vision

NationX Project 03 is a shared-delivery coordination engine designed for local commerce in Tier-2/Tier-3 hubs, piloted in **Khammam, Telangana**. Its primary function is multi-shop, multi-customer batch consolidation: enabling a single delivery partner to collect compatible suborders from multiple local merchants and deliver them to multiple customer destinations in an optimized, deterministic sequence.

The system is architected as a **modular monorepo** with a **SQL-first, Supabase PostgreSQL 16 backend**, a **Next.js 15.5 Web application** (acting as both operator/customer portal and authoritative API server), and an **Expo SDK 58 / React Native 0.88 Mobile application** communicating strictly through `/api/v1` REST endpoints.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT APPLICATIONS                               |
|                                                                                   |
|   +------------------------------------+    +---------------------------------+   |
|   |             apps/web               |    |           apps/mobile           |   |
|   |  - Next.js 15.5 App Router         |    |  - Expo SDK 58 / React Native   |   |
|   |  - React 19, Tailwind CSS v4       |    |  - React 19, TanStack Query     |   |
|   |  - Server Actions (Web forms)      |    |  - Offline-first caching        |   |
|   |  - Admin, Merchant, Customer UI    |    |  - Partner & Field App          |   |
|   +-----------------+------------------+    +----------------+----------------+   |
+---------------------|----------------------------------------|--------------------+
                      |                                        |
                      | Direct Server Calls / Form Actions     | Authenticated HTTP
                      |                                        | (Bearer Token / Cookie)
                      v                                        v
+-----------------------------------------------------------------------------------+
|                         AUTHORITATIVE API GATEWAY & BACKEND                       |
|                               (Hosted in apps/web)                                |
|                                                                                   |
|   Next.js Route Handlers: /api/v1/<module>/...                                    |
|   - /api/v1/auth         - /api/v1/merchants     - /api/v1/partners               |
|   - /api/v1/orders       - /api/v1/batches       - /api/v1/tracking               |
|                                                                                   |
|   Shared Library: packages/shared                                                 |
|   - Zod 4 Schemas, TypeScript DTOs, Enums, Constants, Distance & Fee Math         |
+-----------------------------------------------------------------------------------+
                                        |
                   Authoritative SQL Queries / Supabase Client
                   with User Context or Service Role Key
                                        v
+-----------------------------------------------------------------------------------+
|                          DATA & STATE ENFORCEMENT LAYER                           |
|                              (Supabase PostgreSQL 16)                             |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   | Row Level Security (RLS) - Mandatory on EVERY table                       |   |
|   | - Customer data isolation                                                 |   |
|   | - Merchant scoped to merchant_id                                          |   |
|   | - Partner scoped to assigned active batches & stops                       |   |
|   +---------------------------------------------------------------------------+   |
|   +---------------------------------------------------------------------------+   |
|   | SECURITY DEFINER Functions - Protected Lifecycle State Transitions       |   |
|   | - fn_accept_suborder()          - fn_mark_suborder_ready()                |   |
|   | - fn_create_batch()             - fn_assign_batch_partner()               |   |
|   | - fn_accept_assignment()        - fn_update_stop_status()                 |   |
|   | - fn_complete_delivery()        - fn_record_exception()                   |   |
|   | * All functions enforce search_path = public, pg_temp and log events      |   |
|   +---------------------------------------------------------------------------+   |
|   +---------------------------------------------------------------------------+   |
|   | Relational Core:                                                          |   |
|   | users, merchants, delivery_partners, orders, merchant_suborders,          |   |
|   | order_items, delivery_batches, batch_orders, delivery_assignments,         |   |
|   | delivery_stops, delivery_events, delivery_fees                            |   |
|   | Extensions: pg_trgm (fuzzy text search), pgcrypto (UUIDv4)                |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Monorepo Structure & Module Boundaries

The repository is structured to maintain clean boundaries between web, mobile, shared logic, and database migrations.

```
/
├── apps/
│   ├── web/                     # Next.js 15.5 App Router + Authoritative API
│   │   ├── app/
│   │   │   ├── (auth)/          # Login, Register, Password Recovery
│   │   │   ├── (dashboard)/     # Role-based Portal (Admin, Merchant, Customer)
│   │   │   ├── api/
│   │   │   │   └── v1/          # Authoritative Public & Mobile API Endpoints
│   │   │   │       ├── auth/
│   │   │   │       ├── orders/
│   │   │   │       ├── merchants/
│   │   │   │       ├── partners/
│   │   │   │       ├── batches/
│   │   │   │       └── tracking/
│   │   │   ├── globals.css      # Tailwind CSS v4 Configuration & Design Tokens
│   │   │   └── layout.tsx       # Root layout with Geist font
│   │   ├── lib/                 # Server utilities, Supabase server clients
│   │   ├── server/              # Server Actions for Web Forms
│   │   └── package.json
│   │
│   └── mobile/                  # Expo SDK 58 / React Native 0.88
│       ├── app/                 # Expo Router file-based routes
│       │   ├── (auth)/          # Partner & Customer mobile login
│       │   ├── (partner)/       # Partner workflow: batch acceptance, stops, POD
│       │   └── (customer)/      # Customer tracking & delivery receipt
│       ├── components/          # Native UI widgets with 48dp touch targets
│       ├── hooks/               # TanStack Query hooks fetching /api/v1
│       ├── services/            # API client layer (HTTP client)
│       └── package.json
│
├── packages/
│   └── shared/                  # Universal TypeScript Package
│       ├── src/
│       │   ├── constants/       # Design tokens, error codes, stock vocabulary
│       │   ├── dtos/            # Typed Request/Response contracts
│       │   ├── enums/           # OrderStatus, SuborderStatus, BatchStatus, etc.
│       │   ├── schemas/         # Zod 4 validation schemas
│       │   └── utils/           # Haversine distance, formatting, SLA helpers
│       ├── package.json
│       └── tsconfig.json
│
├── supabase/                    # Supabase SQL Migrations & Database Config
│   ├── migrations/              # Incremental SQL migrations (DDL, RLS, Functions)
│   ├── tests/                   # pgTAP and SQL unit/concurrency tests
│   ├── config.toml              # Supabase CLI configuration
│   └── seed.sql                 # Deterministic demo seed data (Khammam scenarios)
│
├── docker/                      # Self-hosting Docker Compose & Dockerfiles
├── .github/workflows/           # CI: Vitest, SQL tests, Lint, Typecheck, Chromium E2E
├── package.json                 # Monorepo root workspaces config (npm/pnpm)
├── turbo.json                   # Turborepo pipeline orchestration
├── ARCHITECTURE.md              # This document
├── DATABASE.md                  # Comprehensive Database & RLS Reference
├── AGENTS.md                    # Operational Developer & Agent Guidelines
├── context.md                   # Product Context & Domain Rules
└── README.md                    # Setup, running, and testing instructions
```

### Module Boundary Guarantees
1. **API Exclusivity**: `apps/mobile` **never** connects directly to PostgreSQL or executes Supabase RPC functions with elevated privileges. All mobile network calls route through `https://<api-host>/api/v1/...`.
2. **Business Logic Location**: Complex validation and batch compatibility evaluations reside in `packages/shared` and `apps/web/services`. State transitions are atomic inside `SECURITY DEFINER` database functions.
3. **No Frontend Security Reliance**: All authorization checks are evaluated by the backend Route Handlers and enforced by PostgreSQL Row Level Security (RLS).
4. **Shared Types**: Both `apps/web` and `apps/mobile` consume schemas and types from `packages/shared`, ensuring zero drift between request validation and mobile client payloads.

---

## 3. Technology Stack Reference

| Layer | Approved Technology | Purpose / Justification |
|---|---|---|
| **Monorepo** | Turborepo + Workspaces | Fast caching, orchestrated builds across `apps/*` and `packages/*` |
| **Web Framework** | Next.js 15.5 App Router | React 19 server components, streaming, Server Actions, lightweight SSR |
| **Styling** | Tailwind CSS v4 | Zero-runtime CSS, modern CSS cascade layers, light/dark mode support |
| **Font** | Geist Sans & Geist Mono | Highly readable, crisp neutral typography in bright sunlight |
| **Web UI** | shadcn/ui | Unstyled accessible Radix primitives styled with official tokens |
| **Mobile Runtime** | Expo SDK 58 / React Native 0.88 | Stable Android/iOS runtime, New Architecture enabled |
| **Mobile Navigation** | Expo Router | File-based typed routing matching Next.js App Router paradigm |
| **Mobile State** | TanStack Query v5 | Offline cache, background revalidation, network reconnect retries |
| **API Endpoints** | Next.js Route Handlers (`/api/v1/*`) | Type-safe REST API consumed by Web and Mobile |
| **Validation** | Zod 4 | Strict input validation, DTO parsing, shared client-server schemas |
| **Database** | Supabase PostgreSQL 16 | ACID transactions, native JSONB, `pg_trgm`, RLS security |
| **Data Protection** | PostgreSQL RLS + Functions | Row-level tenant isolation + `SECURITY DEFINER` state machines |
| **Search Engine** | PostgreSQL `pg_trgm` | Fast trigram similarity matching for merchant and product search |
| **Auth Provider** | Supabase Auth (GoTrue) | JWTs, secure httpOnly session cookies, Bearer tokens for mobile |
| **Unit Testing** | Vitest (Web/Shared), Jest (Mobile) | Fast ESM-native unit and component test runner |
| **Database Testing** | pgTAP & SQL Test Suites | Automated verification of RLS policies and transition functions |
| **E2E Testing** | Playwright (Chromium) | Real browser flows authenticated against GoTrue |

---

## 4. Authentication & Authorization Architecture

### 4.1 Authentication Protocols
- **Web App**: Uses standard Supabase Auth SSR cookies (`sb-access-token`, `sb-refresh-token`). Cookies are `httpOnly`, `Secure`, and `SameSite=Lax`.
- **Mobile App**: Uses OAuth Bearer tokens managed via `expo-secure-store`. The access token is transmitted in the `Authorization: Bearer <jwt>` HTTP header to `/api/v1` routes.
- **Initial Auth Method**: Email and password authentication.
- **SMS / Phone OTP**: Blocked until a compliant SMS gateway provider is formally integrated. The UI and API must return `501 Not Implemented` if phone OTP is requested.

### 4.2 Role-Based Access Control (RBAC) & Actor Context
Every authenticated user in `auth.users` maps to a record in `public.users` with one primary `UserRole`:
- `ADMIN`: NationX logistics operations personnel. Full platform inspection, manual batch creation, partner assignment overrides, exception management.
- `MERCHANT`: Shop owner/manager. Strictly scoped to their assigned `merchant_id`. Can view orders containing suborders for their shop, update preparation status, and confirm handover.
- `PARTNER`: Delivery rider. Scoped to assigned batches, stops, and delivery tasks. Can accept/reject assignments, update stop progression, and submit Proof of Delivery (POD).
- `CUSTOMER`: Buyer. Scoped strictly to their own orders, suborders, delivery status, and tracking coordinates. Never exposed to other customers' data.

### 4.3 Data Isolation via Row Level Security (RLS)
PostgreSQL RLS is enabled on **every single table** in the database.
RLS policies leverage the authenticated user ID (`auth.uid()`) and user claims:
```sql
-- Example Customer Order Isolation Policy
CREATE POLICY "Customers can only view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

-- Example Merchant Suborder Isolation Policy
CREATE POLICY "Merchants can only view their suborders"
ON public.merchant_suborders
FOR SELECT
TO authenticated
USING (
  merchant_id IN (
    SELECT id FROM public.merchants WHERE user_id = auth.uid()
  )
);
```

---

## 5. API Architecture & Communication Contracts

All public and mobile interactions route through the authoritative API server under `/api/v1/<module>/...`.

### 5.1 Route Structure
```
/api/v1/
├── auth/
│   ├── login          [POST]  - Authenticate and receive session/tokens
│   ├── refresh        [POST]  - Refresh expired JWT
│   └── me             [GET]   - Get authenticated user profile and active role
├── merchants/
│   ├── suborders      [GET]   - List suborders for authenticated merchant
│   ├── [id]/accept    [POST]  - Accept suborder & provide prep estimate
│   ├── [id]/ready     [POST]  - Mark suborder ready for partner pickup
│   └── [id]/handover  [POST]  - Confirm suborder handed over to partner
├── partners/
│   ├── availability   [POST]  - Set status (AVAILABLE, BUSY, OFFLINE)
│   ├── assignments    [GET]   - List offered & active batch assignments
│   ├── [id]/respond   [POST]  - Accept or reject assigned batch
│   └── stops/[id]/status [POST] - Update stop status (ARRIVED, COMPLETED, FAILED)
├── orders/
│   ├── [id]           [GET]   - Fetch order details (scoped to owner)
│   └── [id]/confirm   [POST]  - Confirm customer receipt or report issue
├── batches/
│   ├── candidates     [GET]   - [Admin] List batchable orders by locality
│   ├── create         [POST]  - [Admin] Create shared delivery batch
│   └── [id]/assign    [POST]  - [Admin] Assign batch to delivery partner
└── tracking/
    └── order/[id]     [GET]   - Sanitized customer tracking stream
```

### 5.2 Uniform API Envelope & Error Format
All API responses adhere to strict TypeScript DTOs.
```json
// Success Response
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2026-11-03T04:45:00.000Z",
    "version": "v1"
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Suborder cannot be marked READY before being ACCEPTED.",
    "details": { ... }
  }
}
```

---

## 6. Shared Delivery State Machine & Lifecycle Transitions

The shared delivery lifecycle spans three interconnected state machines:
1. **Parent Order**: `CONFIRMED -> FULFILLING -> PARTIALLY_FULFILLED -> COMPLETED / CANCELLED`
2. **Merchant Suborder**: `PLACED -> ACCEPTED -> PREPARING -> READY_FOR_PICKUP -> PICKED_UP -> DELIVERED (or CANCELLED / EXCEPTION)`
3. **Delivery Batch**: `DRAFT -> OPEN -> ASSIGNED -> ACCEPTED -> IN_PROGRESS -> COMPLETED (or CANCELLED / EXCEPTION)`

### Protected State Transitions via `SECURITY DEFINER` Functions
To eliminate race conditions and enforce auditability, all status changes that span multiple tables or trigger delivery events **must execute through PostgreSQL `SECURITY DEFINER` functions**.

```
                           +--------------------------+
                           |  Customer Places Order   |
                           |  (Order: CONFIRMED)      |
                           |  (Suborders: PLACED)     |
                           +------------+-------------+
                                        |
                                        v
                           +--------------------------+
                           |    Merchant Accepts      |
                           |  (Suborder: ACCEPTED)    |
                           |  fn_accept_suborder()    |
                           +------------+-------------+
                                        |
                                        v
                           +--------------------------+
                           |    Merchant Preparing    |
                           |  (Suborder: PREPARING)   |
                           +------------+-------------+
                                        |
                                        v
                           +--------------------------+
                           | Merchant Marks Ready     |
                           | (READY_FOR_PICKUP)       |
                           | fn_mark_suborder_ready() |
                           +------------+-------------+
                                        |
     +----------------------------------+----------------------------------+
     | Batching Engine Evaluates Locality, Readiness & Partner Capacity    |
     +----------------------------------+----------------------------------+
                                        |
                                        v
                           +--------------------------+
                           |  Batch Created & Assigned|
                           |  (Batch: ASSIGNED)       |
                           |  fn_assign_batch()       |
                           +------------+-------------+
                                        |
                                        v
                           +--------------------------+
                           |  Partner Accepts Job     |
                           |  (Batch: ACCEPTED)       |
                           |  fn_partner_accept()     |
                           +------------+-------------+
                                        |
                 +----------------------+----------------------+
                 | Partner Executes Pickup & Drop-off Stops    |
                 +----------------------+----------------------+
                                        |
             +--------------------------+--------------------------+
             |                                                     |
             v                                                     v
+--------------------------+                         +--------------------------+
| Merchant Stop: PICKUP    |                         | Customer Stop: DROPOFF   |
| (Suborder: PICKED_UP)    |                         | (Suborder: DELIVERED)    |
| Handover confirmed       |                         | POD confirmed            |
+--------------------------+                         +--------------------------+
             |                                                     |
             +--------------------------+--------------------------+
                                        |
                                        v
                           +--------------------------+
                           |   Batch & Order Complete |
                           |   (Batch: COMPLETED)     |
                           |   (Order: COMPLETED)     |
                           +--------------------------+
```

Every database function:
- Runs in an isolated transaction.
- Explicitly sets `SET search_path = public, pg_temp;`.
- Validates that the executing actor has permission to perform the transition.
- Appends an immutable record to `public.delivery_events` with actor, timestamp, previous state, new state, and idempotency key.

---

## 7. Resolution of Conflicts Between Old & New Specifications

| Domain | Initial / Legacy MVP Assumption | Official NationX Requirement | Architecture Resolution |
|---|---|---|---|
| **Database Layer** | Prisma ORM with local PostgreSQL (`DATABASE_URL`) | Supabase PostgreSQL 16 (SQL-first) | **Replaced**. Removed Prisma runtime dependency from backend architecture. Database DDL, RLS, triggers, and state machines are managed via Supabase SQL migrations. Direct queries use `@supabase/supabase-js` or typed SQL clients. |
| **Project Structure** | Single Next.js monolithic repo (`app/`, `lib/`, `prisma/`) | Modular Monorepo: `apps/web`, `apps/mobile`, `packages/shared`, `supabase` | **Restructured**. Architecture defined as a Turborepo monorepo sharing types via `packages/shared` and housing migrations under `supabase/`. |
| **Mobile Access** | Hypothetical direct DB or monolithic web view | Native Expo SDK 58 / React Native 0.88 app | **Isolated**. Mobile connects exclusively to `/api/v1` REST endpoints. No direct database access or client-side SQL execution. |
| **Authentication** | Seeded demo role switcher / mock auth session | Supabase Auth (GoTrue) | **Standardized**. Web uses secure httpOnly cookies; mobile uses Bearer tokens. Phone OTP explicitly disabled until SMS gateway is approved. |
| **Styling & UI** | Tailwind CSS v3 with generic neutrals | Tailwind CSS v4 with official NationX provisional tokens | **Updated**. Token palette applied: Primary Teal `#0F766E`, Dark Primary `#34B8AB`, Light Surface `#F8FAFA`, Dark Surface `#0B1514`, 48dp minimum touch targets, Geist font. |
| **Search Engine** | Standard SQL `LIKE` queries | PostgreSQL `pg_trgm` extension | **Added**. Trigram index configured on merchant names, addresses, and product listings for fast fuzzy local search. |
| **State Security** | Node.js service transactions | `SECURITY DEFINER` PostgreSQL functions | **Hardened**. State transitions execute inside atomic PostgreSQL functions enforcing RLS bypass safely with explicit actor validation and audit logging. |

---

## 8. Unresolved Decisions & Open Policy Questions

The following decisions depend on commercial, operational, or legal sign-off from NationX leadership:

1. **Proof of Delivery (POD) Minimum Standard**: Does POD require a physical signature, one-time customer OTP, photo upload, or geo-fenced partner tap?
   - *Current MVP Stance*: Configurable fallback supporting OTP and partner confirmation with latitude/longitude stamp.
2. **Delivery Fee Commercial Model**: Who pays the shared delivery fee (customer, merchant, or split)? What is the compensation formula for delivery partners on multi-stop batches?
   - *Current MVP Stance*: Marked explicitly as **DEMO POLICY** in `DeliveryFee`. System calculates baseline distance/stop fee without binding commercial obligations.
3. **Cancellation & Merchant Waste Liability**: If a customer cancels an order while a merchant is already preparing food or perishable goods, who absorbs the product cost?
   - *Current MVP Stance*: Suborders transition to `CANCELLED` or `EXCEPTION`, triggering an administrative audit event for manual intervention.
4. **Partner Settlement & COD**: Cash on Delivery (COD) and automated driver bank payouts remain **disabled**.
   - *Current MVP Stance*: Stored as settlement reference ledger entries only; no live payment gateway or escrow integration is enabled.

