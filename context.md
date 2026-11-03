# NationX Shared Delivery & Logistics — Product & Technical Context

**Project 03 — Shared Delivery Coordination Engine**  
*Document Version: 2.0 (Supabase SQL-First & Modular Monorepo Specification)*

---

## 1. Product Objective

NationX Shared Delivery is the common fulfilment engine for local commerce orders in Tier-2/Tier-3 regional markets, piloted in **Khammam, Telangana**. It coordinates orders from multiple local shops and consolidates compatible orders from multiple customers into a single delivery partner's shared route.

### Core Principle
Maximize route density, partner earnings, and customer convenience without compromising order accuracy, customer commitments, food safety, or promised delivery time windows.

---

## 2. Target Users & Operating Environment

### User Personas
1. **Local Shopkeepers (Merchants)**:
   - Kirana store owners, sweet shops, bakeries, and local restaurants in Khammam.
   - Varied tech literacy; require dead-simple actions: Accept, Set Preparation Time, Mark Ready, Confirm Handover.
   - Need clear distinction between order acceptance and actual readiness.
2. **Delivery Partners**:
   - Two-wheeler local riders operating across Khammam town.
   - Use low-end to mid-range Android devices (2–4 GB RAM).
   - Operate outdoors in intense sunlight; require high-contrast UI, legible text, and large 48dp touch targets.
   - Frequently encounter patchy 2G/3G connectivity; require offline caching and graceful sync.
3. **End Customers**:
   - Local residents ordering from neighbourhood shops.
   - View promised delivery windows, fee breakdowns, and independent status tracking for each merchant suborder.
   - Must never see another customer's name, phone, address, or items.
4. **Operations / Dispatch Admin**:
   - Central operators monitoring batches, capacity, at-risk orders, and resolving delivery exceptions.
   - Every manual intervention is recorded in an immutable audit log.

### Environmental Constraints
- **Device Limitations**: 2–4 GB RAM phones; strict restraint on client-side bundle size, zero heavy decorative animations.
- **Network Reality**: Frequent network drops; offline caching via TanStack Query on mobile, optimistic UI updates with rollback, idempotent API endpoints.
- **Visual Conditions**: High ambient glare; UI strictly adheres to high-contrast palette and official NationX design tokens.

---

## 3. Supported Fulfilment Modes & Operating Models

### Fulfilment Modes
1. **Scheduled Shared Delivery**: Compatible multi-shop orders combined into an operational batch based on locality, merchant prep deadlines, partner capacity, and delivery windows.
2. **Express Delivery**: Offered only when dedicated partner capacity, merchant instant readiness, and route constraints make immediate dispatch feasible.
3. **Customer Pickup**: Direct collection by the customer from the shop; explicitly **does not** create a delivery partner assignment or transit states.
4. **Multi-Shop Fulfilment**: A single customer order may encompass suborders across multiple distinct merchants. Each merchant independently prepares and hands over items.

### Operating Models
- **Visit the Shop**: Physical store visit information.
- **Pickup**: Customer collects at merchant counter.
- **Delivery**: Coordinated via shared logistics engine.
- **By Appointment**: Scheduled consultation or service.
- **Quotation**: Price unconfirmed until merchant inspection.

---

## 4. Shared Batch Model & Batching Rules

A delivery batch is strictly an **operational grouping**, NEVER a commercial consolidation.

```
[ Customer Order A ] ---> Suborder A1 (Shop 1: Balaji Kirana)  --\
                                                                 +--> [ Coordinated Shared Batch ]
[ Customer Order B ] ---> Suborder B1 (Shop 2: Bawarchi Biryani) -+    - Partner: Rider Suresh
                                                                 |    - Stop 1: Pickup Shop 1
[ Customer Order C ] ---> Suborder C1 (Shop 3: Krishna Sweets) -/    - Stop 2: Pickup Shop 2
                                                                      - Stop 3: Pickup Shop 3
                                                                      - Stop 4: Dropoff Customer A
                                                                      - Stop 5: Dropoff Customer B
                                                                      - Stop 6: Dropoff Customer C
```

### Preserved Independence Per Order
Every original customer order and merchant suborder retains:
- Individual customer identity and private delivery address.
- Independent item listings, quantities, and prices.
- Distinct payment reference and delivery fee record.
- Independent delivery status and Proof of Delivery (POD) record.
- Comprehensive audit event history.

### Batching Eligibility Algorithm Constraints
The batching engine evaluates candidate orders deterministically:
1. **Locality / Service Zone Match**: All pickup and drop-off points must reside in the same configured zone (e.g. Khammam Central / Wyra Road).
2. **Time Window Overlap**: Customer delivery windows must align with estimated travel and prep times.
3. **Merchant Readiness / Feasibility**: Suborders must be marked `READY_FOR_PICKUP` or have confirmed preparation estimates fitting the pickup route.
4. **Partner Carrying Capacity**: Cumulative weight and parcel units cannot exceed the partner's vehicle capacity units (default: 10 units for 2-wheeler).
5. **Handling Compatibility**: Incompatible goods (e.g. hot biryani vs. ice cream vs. non-food detergent) cannot be co-loaded in violation of handling tags.
6. **Maximum Stops Constraint**: Configurable threshold (default: max 8 stops / 4 orders per batch).
7. **No Artificial Delays**: Ready orders approaching dispatch deadlines are dispatched immediately rather than held to accumulate candidates.

---

## 5. Delivery Lifecycle & State Machine

```
Order Request:      [CONFIRMED] --------> [FULFILLING] --------> [COMPLETED]
                                              |
                                              v
Merchant Suborder:  [PLACED] -> [ACCEPTED] -> [PREPARING] -> [READY_FOR_PICKUP] -> [PICKED_UP] -> [DELIVERED]
                                                                                          |
                                                                                          v
Batch Lifecycle:    [DRAFT] -> [OPEN] -> [ASSIGNED] -> [ACCEPTED] -> [IN_PROGRESS] -> [COMPLETED]
```

### State Definitions & Permitted Roles
- **Merchant Suborder**:
  - `PLACED`: Customer confirmed order; awaiting shop review.
  - `ACCEPTED`: Merchant accepts and provides prep time.
  - `PREPARING`: Kitchen/packing in progress.
  - `READY_FOR_PICKUP`: Merchant confirms parcel is packaged and staged.
  - `PICKED_UP`: Partner arrives, verifies items, and confirms handover.
  - `DELIVERED`: Drop-off completed with POD confirmation.
  - `EXCEPTION` / `CANCELLED`: Item missing, shop rejected, or order cancelled.
- **Delivery Batch**:
  - `DRAFT`: Grouping suggested by engine or admin.
  - `OPEN`: Dispatched for partner discovery.
  - `ASSIGNED`: Offered to specific delivery partner.
  - `ACCEPTED`: Partner accepts assignment and route sequence.
  - `IN_PROGRESS`: First pickup or transit commenced.
  - `COMPLETED`: All stops successfully executed.
  - `EXCEPTION`: Partner breakdown, customer unavailable, or route aborted.

All state transitions execute via `SECURITY DEFINER` PostgreSQL functions logging to `public.delivery_events`.

---

## 6. Official Provisional Design Tokens & UI Guidelines

| Token Name | Hex Value | Application |
|---|---|---|
| Primary Teal | `#0F766E` | Main interactive controls, active badges, header accents |
| Dark-Mode Primary | `#34B8AB` | Primary interactive elements in dark theme |
| Light Surface | `#F8FAFA` | Neutral light background, daylight readability |
| Dark Surface | `#0B1514` | High-contrast dark theme background |
| Danger | `#B42318` | Destructive actions, SLA breach alerts, failed deliveries |
| Success | `#166534` | Handover confirmed, delivered status, batch completed |
| Warning | `#92400E` | Dispatch deadlines approaching, manual review required |

### Accessibility & Ergonomics
- **Touch Targets**: Minimum **48 dp (48px)** for all buttons, toggles, and tap areas.
- **Typography**: Body text at **16 sp (16px)** for effortless outdoor reading.
- **Border Radius**: 12 (12px / `rounded-xl`).
- **Typography Stack**: Geist Sans for UI text, Geist Mono for batch codes and order numbers.
- **High-Sunlight Contrast**: No light grey text on white backgrounds; high-contrast borders and surfaces.
- **Multi-Modal Status**: Status must never be conveyed by colour alone (always display an icon and explicit text label).

---

## 7. Language & Shared Stock Vocabulary

- **Primary Language**: English UI initially.
- **Telugu Support**: Native UTF-8 support for Telugu merchant names, item titles, and customer delivery notes.
- **Decoupled Strings**: Keep user-facing strings separated from core logic to enable future full Telugu localization.
- **Voice UI**: Voice interactions remain disabled.

### Mandatory Stock Vocabulary
- `In stock`: Item available for immediate packing.
- `Call to confirm`: Stock availability uncertain or older than 3 days.
- `Out of stock`: Item unavailable.

### Uncertainty & Quotation Vocabulary
- If price is pending merchant quotation: `"Price not yet confirmed (quotation)"`
- If availability is unverified: `"Call to confirm"`
- Explicitly differentiate: `Request` (inquiry), `Quotation` (provisional estimate), and `Confirmed Order` (authoritative commitment).

---

## 8. Database & API Architecture Summary

- **Database**: Supabase PostgreSQL 16.
- **Row Level Security (RLS)**: Mandatory on **every table**. Direct customer-to-customer data leakage is impossible at the database engine level.
- **State Machine Security**: Protected state transitions run in `SECURITY DEFINER` stored procedures (`fn_mark_suborder_ready`, `fn_respond_assignment`, etc.) with `search_path = public, pg_temp`.
- **Text Search**: PostgreSQL `pg_trgm` GIN indexes for fast fuzzy matching across shops, localities, and products.
- **API Standard**: Next.js 15.5 Route Handlers exposing `/api/v1/<module>/...`.
- **Client Access**:
  - `apps/web`: Server Actions and authenticated route queries using Supabase SSR session cookies.
  - `apps/mobile`: Expo SDK 58 consuming `/api/v1` using Authorization Bearer tokens. Mobile **never** connects directly to PostgreSQL.
- **Validation**: Strict Zod 4 schemas shared across web, mobile, and API via `packages/shared`.

---

## 9. Performance & Scope Boundaries

### Performance Metrics
- **Initial Page Load Target**: ~150 kB bundle.
- **Mobile Memory Footprint**: Responsive and leak-free on 2 GB RAM Android hardware.
- **Offline Resilience**: TanStack Query cache survives short network dropouts.

### Out of Scope for MVP
- Production-grade SMS / Phone OTP (blocked until SMS provider integrated).
- Live GPS vehicle animations or third-party paid map routing SDKs.
- Real payment gateway transactions and real banking driver payouts.
- Integration with external NationX enterprise modules (Smart POS, Khata, Foundation).

---

## 10. Requirement Traceability Matrix

| Requirement | Module / UI | Database Model | Enforcement Mechanism | Status |
|---|---|---|---|---|
| Multi-shop Batching | `/batches` API & Admin UI | `delivery_batches`, `batch_orders` | Batching service + Locality check | Specified |
| Order Independence | Order / Suborder views | `orders`, `merchant_suborders` | Relational 1:N isolation | Specified |
| Customer Privacy | Customer Portal | `orders`, `public.users` | RLS Policy (`customer_id = auth.uid()`) | Specified |
| Merchant Readiness | Merchant Dashboard | `merchant_suborders` | `fn_mark_suborder_ready` (`SECURITY DEFINER`) | Specified |
| Partner Workflow | Mobile Rider App | `delivery_assignments`, `delivery_stops` | `/api/v1/partners` + RLS | Specified |
| Audit Trail | Admin Audit Inspector | `delivery_events` | Immutable insert trigger & function log | Specified |
| Idempotent Mutate | `/api/v1` Handlers | `idempotency_key` (UNIQUE) | SQL unique constraint & key check | Specified |
| Daylight Design | Tailwind CSS v4 Theme | Design Tokens | CSS custom properties & 48dp targets | Specified |
