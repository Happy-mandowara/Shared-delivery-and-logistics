# NationX Project 03 — Vercel Production Deployment Guide

This guide describes how to deploy the production-ready NationX Project 03 monorepo directly to Vercel.

---

## 1. Project Overview & Architecture

* **Framework**: Next.js 15.5 App Router + React 19 + TypeScript
* **Monorepo Structure**:
  * `apps/web`: Production Next.js web application and authoritative API route handlers (`/api/v1/*`)
  * `packages/shared`: Shared types, domain constants, and utilities
  * `supabase/`: Versioned migrations and deterministic seed datasets
* **Database**: PostgreSQL 16 / Supabase PostgreSQL with mandatory Row-Level Security (RLS)

---

## 2. Vercel Project Configuration

When importing this repository into Vercel:

| Setting | Value | Notes |
|---|---|---|
| **Framework Preset** | Next.js | Automatically detected |
| **Root Directory** | `./` (or leave blank) | `vercel.json` automatically builds `@nationx/web` workspace |
| **Build Command** | `npm run build --workspace=@nationx/web` | Defined in `vercel.json` |
| **Output Directory** | `apps/web/.next` | Defined in `vercel.json` |
| **Install Command** | `npm install` | Installs root workspace dependencies |

---

## 3. Environment Variables

Configure the following environment variables in your Vercel Project Settings (**Settings > Environment Variables**):

| Variable Name | Required | Example / Recommended Value | Description |
|---|---|---|---|
| `DATABASE_URL` | **YES** | `postgresql://postgres.[REF]:[PASS]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require` | Supabase connection string. For serverless Next.js route handlers, use Supabase Transaction Pooler (port 6543). |
| `JWT_SECRET` | **YES** | `your-high-entropy-cryptographic-secret-32-chars` | HMAC-SHA256 secret used to sign session tokens and verify Edge Middleware (`middleware.ts`). |
| `NODE_ENV` | Automatically set | `production` | Set by Vercel automatically. |
| `ALLOW_TEST_UUID_AUTH` | **YES** | `false` | Must remain `false` in production to prevent raw UUID auth bypassing GoTrue JWT validation. |
| `NEXT_PUBLIC_ENABLE_DEMO_MODE` | **YES** | `false` | Disables demo banners and simulation aids on customer-facing screens. |

---

## 4. Pre-Deployment Verification Checklist

Before pushing to production, verify locally:

1. **TypeScript Typecheck**:
   ```bash
   cd apps/web && npm run typecheck
   # Output: tsc --noEmit (0 errors)
   ```
2. **Production Build**:
   ```bash
   cd apps/web && npm run build
   # Output: ✓ Compiled successfully (91/91 static & dynamic routes, 102 kB shared JS)
   ```
3. **Automated Test Suite**:
   ```bash
   npm test
   # Output: 176 PASSED, 0 FAILED across DB, API, Security, Commerce, and Acceptance suites
   ```

---

## 5. Post-Deployment Verification

Once deployed to your `*.vercel.app` domain:

1. **Verify Security (Edge Middleware)**:
   ```bash
   curl -I https://your-deployment.vercel.app/admin
   # Expected: HTTP/1.1 307 Temporary Redirect -> /login?redirect=%2Fadmin
   ```
2. **Verify Merchant Directory & Categories**:
   ```bash
   curl https://your-deployment.vercel.app/api/v1/categories
   # Expected: HTTP 200 with JSON categories and counts
   ```
3. **Verify Interactive Maps**:
   * Navigate to `/explore` or `/customer/explore`.
   * Maps load using Leaflet + OpenStreetMap tiles with zero external key requirements, centered on Khammam (17.2472° N, 80.1514° E).

