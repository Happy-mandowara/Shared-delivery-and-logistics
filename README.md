# NationX Shared Delivery & Logistics — Monorepo

**Project 03 — Multi-Shop Shared Delivery Fulfilment Engine**  
*Official Architecture: Supabase PostgreSQL 16 + Next.js 15.5 + Expo SDK 58*

---

## 1. Project Overview

NationX Project 03 is an intelligent shared-delivery coordination engine designed for Tier-2/Tier-3 regional commerce, piloted in **Khammam, Telangana**. It enables a single delivery partner to collect compatible merchant suborders from multiple shops and deliver them to multiple customer destinations on a single, coordinated operational batch.

This repository is organized as a **modular monorepo**:
- **`apps/web`**: Next.js 15.5 App Router web application, Admin/Merchant/Customer portals, and authoritative `/api/v1` backend Route Handlers.
- **`apps/mobile`**: Expo SDK 58 / React Native 0.88 native mobile application for Delivery Partners and mobile customers, consuming exclusively `/api/v1`.
- **`packages/shared`**: Universal TypeScript contracts, Zod 4 validation schemas, DTOs, constants, and distance math.
- **`supabase/`**: SQL migrations, Row Level Security (RLS) policies, `SECURITY DEFINER` state machine functions, and deterministic test seed data.

---

## 2. Technology Stack

| Layer | Approved Technology |
|---|---|
| **Architecture** | Modular Monorepo (Turborepo + Workspaces) |
| **Web & API** | Next.js 15.5 (App Router), React 19, Server Actions, Route Handlers (`/api/v1`) |
| **Styling** | Tailwind CSS v4, shadcn/ui primitives, Geist font |
| **Mobile** | Expo SDK 58, React Native 0.88, Expo Router, TanStack Query v5 |
| **Database** | Supabase PostgreSQL 16 (SQL-First, RLS on every table, `pg_trgm`) |
| **State Security**| `SECURITY DEFINER` PostgreSQL functions with locked `search_path` |
| **Authentication**| Supabase Auth (GoTrue) — Email/Password (Phone OTP blocked) |
| **Validation** | Zod 4 for input and DTO validation |
| **Testing** | Vitest (Web/Shared), Jest (Mobile), pgTAP (Database/RLS), Playwright (Chromium E2E) |
| **Deployment** | Docker Compose (self-hosted), Vercel (Web), EAS (Mobile) |

> [!IMPORTANT]
> **No ORM Replacement**: Prisma is not an approved database layer for this project. The architecture uses pure Supabase SQL migrations, functions, triggers, and Row Level Security.

---

## 3. Prerequisites

- **Node.js**: v20.x or v22.x LTS (tested on Node v22+)
- **npm** or **pnpm**: Node package manager
- **Supabase CLI**: For local PostgreSQL, GoTrue auth, migrations, and seeds (`npm install -g supabase` or via `npx supabase`)
- **Docker Desktop**: Required by Supabase CLI to run local PostgreSQL, Auth, and Storage containers
- **Expo Go** / Android Emulator: For running `apps/mobile`

---

## 4. Environment Variables

Create `.env` in the root (and in `apps/web/.env.local` / `apps/mobile/.env`):

```bash
# Supabase Local Development
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Direct PostgreSQL Connection (for CLI and test scripts)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

# Application Settings
NEXT_PUBLIC_API_BASE_URL="http://localhost:3000/api/v1"
NODE_ENV="development"
```

---

## 5. Local Setup & Database Initialization

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Supabase
Ensure Docker Desktop is running, then initialize Supabase:
```bash
npx supabase start
```
This starts local PostgreSQL 16, Supabase Auth (GoTrue), Supabase Studio, and the REST API gateway.

### 3. Run Migrations & Deterministic Seed
Apply versioned migrations and populate Khammam demo scenarios:
```bash
npx supabase db reset
```
This executes all SQL scripts in `supabase/migrations/` and populates `supabase/seed.sql`.

### Seeded Demo Accounts
All seeded accounts use password: `Password123!`
- **Administrator**: `admin@nationx.local`
- **Merchant (Bawarchi Biryani)**: `bawarchi@nationx.local`
- **Merchant (Balaji Kirana)**: `balaji@nationx.local`
- **Merchant (Sri Krishna Sweets)**: `krishna@nationx.local`
- **Delivery Partner (Suresh Rider)**: `partner1@nationx.local`
- **Customer (Rajesh)**: `customer1@nationx.local`
- **Customer (Priya)**: `customer2@nationx.local`

---

## 6. Running the Applications

### Run Web Application (Admin, Merchant, Customer Portals & API)
```bash
npm run dev:web
# or: cd apps/web && npm run dev
```
Open [http://localhost:3000](http://localhost:3000).  
The authoritative API is available at [http://localhost:3000/api/v1](http://localhost:3000/api/v1).

### Run Mobile Application (Partner & Customer App)
```bash
npm run dev:mobile
# or: cd apps/mobile && npx expo start
```
Press `a` to open Android Emulator, or scan the QR code using Expo Go on a physical Android phone.

---

## 7. Testing Suites

```bash
# Run unit and component tests (Web & Shared)
npm run test:unit

# Run PostgreSQL RLS and state transition SQL tests
npm run test:db

# Run mobile unit tests
npm run test:mobile

# Run End-to-End browser tests (Playwright against GoTrue auth)
npm run test:e2e

# Run complete CI test suite
npm run test
```

---

## 8. Documentation Reference

- [ARCHITECTURE.md](file:///c:/Users/LENOVO/Documents/Shared-delivery-and-logistics/ARCHITECTURE.md): Monorepo structure, API boundaries, state machines, and conflict resolutions.
- [DATABASE.md](file:///c:/Users/LENOVO/Documents/Shared-delivery-and-logistics/DATABASE.md): Supabase PostgreSQL 16 tables, RLS policies, `SECURITY DEFINER` functions, and pg_trgm search.
- [AGENTS.md](file:///c:/Users/LENOVO/Documents/Shared-delivery-and-logistics/AGENTS.md): Coding guidelines, non-negotiable domain rules, and provisional design tokens.
- [context.md](file:///c:/Users/LENOVO/Documents/Shared-delivery-and-logistics/context.md): User personas, Khammam operating constraints, stock vocabulary, and scope boundaries.

---

## 9. Important Policies & Safeguards

- **Demo Policy Notice**: Delivery fee calculation, driver compensation, and settlement figures are marked as **DEMO POLICY** and are not legally binding commercial terms.
- **Cash on Delivery (COD)**: Remains strictly disabled until formal business sign-off.
- **Phone OTP**: Blocked until a compliant SMS gateway provider is formally approved and connected.
- **No Mock Live GPS**: The MVP does not pretend to offer live satellite tracking; distance and ETAs are clearly displayed as static estimates.
