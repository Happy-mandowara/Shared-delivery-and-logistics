# AGENTS.md — NationX Shared Delivery & Logistics

**Official Developer & AI Agent Guidelines**  
*Project 03: Shared Delivery Coordination Engine*  
*Document Version: 2.0 (Supabase SQL-First & Modular Monorepo Architecture)*

---

## 1. Mission & Non-Negotiable Domain Rules

Build the production MVP of NationX Project 03: an intelligent shared-delivery coordination engine piloted in **Khammam, Telangana**. One delivery partner collects compatible merchant suborders from multiple shops and delivers them to multiple customers across one coordinated delivery batch.

### Non-Negotiable Rules
1. **Never merge customer orders commercially**: Every customer order, merchant suborder, item, payment reference, address, fee, and delivery outcome must remain independently auditable and traceable.
2. **A delivery batch is an operational grouping only**: A batch must never replace, overwrite, or mutate the source order records.
3. **Never batch solely on order time**: Batch compatibility requires locality matching, compatible promised windows, merchant readiness, partner capacity, item handling constraints, and service rules.
4. **Never hold a ready order to increase batch size**: If waiting for another candidate order risks the dispatch deadline or customer commitment of a ready order, dispatch it immediately.
5. **Customer pickup must never assign a delivery partner**: Customer pickup follows an independent workflow without transit states or rider assignment.
6. **Merchant acceptance does not mean an order is ready**: Acceptance records shop agreement to prepare. Order readiness must be explicitly confirmed (`READY_FOR_PICKUP`).
7. **Reaching a destination is not proof of delivery**: Physical delivery completion requires explicit Proof of Delivery (POD) confirmation.
8. **Do not invent commercial terms**: Fee calculations, compensation rates, COD rules, and cancellation charges must remain configurable and visibly marked as DEMO POLICY until formally signed off.
9. **Never expose customer PII to other customers**: Address, phone, order contents, and payment references of one customer must never be leaked to another customer or unauthorized party.
10. **Every intervention must be audited**: State transitions, administrative overrides, partner reassignments, and cancellations must be recorded in `public.delivery_events` with actor, timestamp, and rationale.

---

## 2. Official Technology Stack

Every contributor (human or AI agent) must strictly adhere to this official technology stack. **Do not introduce Prisma or another ORM as a replacement for the official Supabase SQL-first architecture. Do not silently change framework versions or technologies.**

### Web Application (`apps/web`)
- **Framework**: Next.js 15.5 App Router
- **UI Library**: React 19
- **Type System**: TypeScript with `strict: true`
- **Styling**: Tailwind CSS v4
- **Component Primitives**: shadcn/ui
- **Typography**: Geist Sans & Geist Mono
- **Web Forms**: Server Actions for mutation workflows

### Authoritative Backend & APIs (`apps/web`)
- **API Runtime**: Next.js Route Handlers
- **API Namespace**: Endpoints under `/api/v1/<module>/...` (e.g. `/api/v1/orders`, `/api/v1/batches`)
- **Authentication**: Supabase Auth (GoTrue) via secure httpOnly session cookies (web) or Authorization Bearer tokens (mobile)
- **Validation**: Zod 4 for request and DTO payload validation

### Database Layer (`supabase/`)
- **Database**: Supabase PostgreSQL 16
- **Row Level Security**: Mandatory RLS enabled on **EVERY table**
- **State Machine Protection**: `SECURITY DEFINER` PostgreSQL functions for protected lifecycle state transitions
- **Schema Validation**: SQL `CHECK` constraints alongside application-level Zod schemas
- **Search Extension**: PostgreSQL `pg_trgm` for trigram fuzzy text search
- **Migrations**: Versioned SQL migrations under `supabase/migrations/`

### Authentication
- **Provider**: Supabase Auth (GoTrue)
- **Supported Methods**: Email and password initially
- **Phone OTP**: **BLOCKED** until a compliant SMS gateway provider is formally approved and integrated

### Mobile Application (`apps/mobile`)
- **Framework**: Expo SDK 58
- **Runtime**: React Native 0.88
- **Navigation**: Expo Router (file-based routing)
- **Data Fetching & Cache**: TanStack Query v5 with offline persistence
- **Architecture Constraint**: Mobile must communicate **exclusively** through `/api/v1` REST endpoints. It must **never** connect directly to PostgreSQL.

### Shared Logic & Types (`packages/shared`)
- **Shared Code**: Common TypeScript types, DTO contracts, Zod 4 schemas, error codes, and math utilities (Haversine distance, SLA helpers).

### Testing & Quality Assurance
- **Unit Tests**: Vitest for web and shared packages; Jest for mobile
- **Database Tests**: pgTAP and SQL test suites verifying RLS policies and state transitions
- **Concurrency Tests**: Concurrent assignment and idempotent mutation tests
- **HTTP Integration Tests**: Supertest / Vitest testing `/api/v1` route handlers
- **E2E Tests**: Playwright (Chromium) executing user journeys against real GoTrue authentication

### Deployment & CI/CD
- **Containerization**: Docker Compose for self-hosting Supabase and web app
- **Hosting**: Vercel for web/API where applicable
- **Mobile Builds**: EAS (Expo Application Services)
- **CI Workflow**: GitHub Actions running lint, typecheck, Vitest, SQL tests, and Playwright

---

## 3. Product & User Experience Standards

### Target Users & Environment
- **Context**: Shopkeepers, delivery riders, and residents of Khammam, Telangana.
- **Hardware Profile**: Low-end Android smartphones (2–4 GB RAM).
- **Network Environment**: High-latency, patchy, intermittent 2G/3G/4G connectivity.
- **Physical Environment**: Outdoor usage under intense, bright sunlight.
- **Technical Literacy**: Variable; interfaces must be intuitive, honest, and unencumbered by technical jargon.

### Design Principles
1. **Lightweight First Load**: Initial web page bundle must target approximately **150 kB**.
2. **Readability in Bright Sunlight**: High contrast surfaces, crisp typography, and 16 sp base text.
3. **Accessibility**: Every interactive touch target must be **at least 48 dp (48px)**. Every input must have an accessible label. Error messages must be assistive-technology accessible.
4. **Never Rely on Colour Alone**: Pair status chips with unambiguous text labels and icons.
5. **No Fake Reality**: Never fabricate live GPS coordinates, simulated delivery routes, fake ETAs, or fake payment confirmations.

### Official Provisional Design Tokens
| Token | Hex Value | Purpose |
|---|---|---|
| Primary Teal | `#0F766E` | Main branding, primary buttons, active tabs |
| Dark-Mode Primary | `#34B8AB` | Primary accents in dark mode |
| Light Surface | `#F8FAFA` | Page background, clean daylight reading |
| Dark Surface | `#0B1514` | Dark-mode background surface |
| Danger | `#B42318` | Destructive actions, SLA breaches, failed stops |
| Success | `#166534` | Completed deliveries, ready suborders, accepted jobs |
| Warning | `#92400E` | Approaching deadlines, exceptions needing review |

- **Border Radius**: 12 (12px / `rounded-xl`)
- **Themes**: Support light and dark modes

### Language & Stock Vocabulary
- **Language**: English UI initially. Telugu text content must be supported natively as UTF-8. All user-facing strings must remain decoupled from business logic to enable future Telugu UI localization. Voice features remain disabled.
- **Stock Vocabulary**:
  - `In stock`
  - `Call to confirm`
  - `Out of stock`
  - *Freshness Policy*: Any inventory or stock information older than 3 days must display `"Call to confirm"`.
- **Handling Unknowns**:
  - If availability is uncertain: `"Call to confirm"`
  - If pricing is unconfirmed: `"Call for price"` or `"Price not yet confirmed (quotation)"`
  - Explicitly distinguish between `Request`, `Quotation`, and `Confirmed Order`.

---

## 4. Coding & API Conventions

### Backend & API Route Handlers
- All API route handlers belong under `apps/web/app/api/v1/<module>/route.ts`.
- Every incoming request body and query parameter must be validated using **Zod 4**.
- Return consistent error payloads:
  ```json
  {
    "success": false,
    "error": {
      "code": "STRING_ERROR_CODE",
      "message": "Human readable explanation",
      "details": {}
    }
  }
  ```
- Make assignment and status-changing operations **idempotent** by accepting and recording an `idempotency_key`. Duplicate requests with identical keys must return the cached result without creating duplicate records.
- Avoid N+1 database queries; perform aggregated SQL selections or join queries.

### Database Operations & Security
- Never bypass RLS in client-facing API routes unless executing within an approved administrative action.
- When writing `SECURITY DEFINER` functions in PostgreSQL:
  - Always specify `SET search_path = public, pg_temp;`.
  - Immediately run `REVOKE ALL ON FUNCTION ... FROM PUBLIC;`.
  - Explicitly run `GRANT EXECUTE ON FUNCTION ... TO authenticated;`.
  - Validate that `auth.uid()` corresponds to an authorized user role for the requested operation.

### React & Next.js Guidelines
- Keep business logic out of presentation components. Place business logic in `packages/shared` or `apps/web/services`.
- Store timestamps as UTC (`TIMESTAMPTZ`) in the database; format timestamps to Indian Standard Time (IST / Asia/Kolkata) in UI display components.
- Include explicit Loading, Empty, Error, Success, and Disabled states on every screen.

---

## 5. Required Acceptance Demo Journey

The core acceptance demonstration for NationX Project 03 requires:
1. **Admin Overview**: Admin views seeded unassigned orders from at least 3 shops and multiple customers in Khammam.
2. **Batch Formation**: Admin batching engine groups compatible orders into a single shared batch based on locality and delivery windows.
3. **Partner Assignment**: Batch is offered to an available delivery partner (`PARTNER_ASSIGNED`).
4. **Partner Acceptance**: Partner accepts the assigned job (`ASSIGNMENT_ACCEPTED`).
5. **Merchant Preparation**: Merchants mark their respective suborders `READY_FOR_PICKUP` and confirm handover to partner (`PICKED_UP`).
6. **Execution & Proof of Delivery**: Partner executes the stop sequence and records drop-off with Proof of Delivery confirmation for each customer.
7. **Customer Privacy**: Customer dashboard verifies that customer sees only their own order status, items, and delivery outcome.
8. **Audit Log & Exceptions**: Admin inspects the audit log (`public.delivery_events`) to review state transitions and a simulated exception resolution.
9. **Idempotency Guarantee**: Duplicate assignment or status requests confirm zero duplicate event or settlement creation.
