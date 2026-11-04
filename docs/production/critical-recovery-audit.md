# NATIONX PROJECT 03 — CRITICAL PRODUCT RECOVERY & STABILIZATION AUDIT REPORT

**Release:** 2.1.0-production-pilot  
**Target Region:** Khammam, Telangana, India  
**Date:** November 4, 2026  
**Status:** AUDIT COMPLETED — ACTION PLAN READY  

---

## EXECUTIVE SUMMARY

A rigorous audit of the NationX Project 03 codebase, database migrations, authentication architecture, API route handlers, and frontend components was conducted following runtime failure reports. 

The application suffered from critical architectural misconfigurations rather than missing features:
1. **Security Bypass (P0)**: No Next.js `middleware.ts` existed; protected routes returned HTTP 200 to unauthenticated requests.
2. **Missing Shops & Approval Deadlock (P1)**: Newly registered merchants entered `is_approved = false`, but the Admin directory filtered them out, rendering new shops invisible and unapprovable.
3. **Image 404 Disconnect (P1)**: Upload path resolution in Next.js evaluated `process.cwd()` from `apps/web`, saving uploads into `apps/web/apps/web/public/uploads` instead of the public static folder.
4. **Navigation Slowness (P1)**: Page-level full browser reloads (`window.location.href`), sequential blocking auth checks in layouts, and lack of API pagination.
5. **Map Placeholder Fallback (P2)**: Dependency on unconfigured external Mapbox API keys instead of open tile layers (OpenStreetMap/Leaflet).

---

## 1. COMPREHENSIVE ISSUE REGISTER

| Issue ID | Severity | Affected Component | Actual Behaviour | Expected Behaviour | Root Cause & Technical Evidence | Proposed Fix | Regression Test |
|---|---|---|---|---|---|---|---|
| **ISS-SEC-01** | **P0 (Critical)** | Next.js Server & Routing (`apps/web`) | `GET /admin`, `/merchant`, `/partner` returns HTTP 200 HTML shell without auth. | HTTP 307 redirect to `/login` or 401 Unauthorized for unauthenticated HTTP requests. | Lack of Next.js `middleware.ts`. Route protection was delegated purely to client-side `useEffect` in React layout components. | Implement authoritative Next.js `middleware.ts` decoding JWT and validating roles on Edge runtime. | `curl -I /admin` returns HTTP 307 to `/login`. |
| **ISS-SHP-01** | **P1 (High)** | Merchant Directory API (`/api/v1/merchants`) | Only 3 seed shops appear; new onboarding merchants never appear anywhere. | Pending merchants appear in Admin dashboard for review; approved shops appear in Customer marketplace. | `/api/v1/merchants/route.ts` hardcodes `WHERE m.is_active = true AND (m.is_approved IS TRUE OR m.is_approved IS NULL)`. Admin UI has no toggle or endpoint to view/approve pending merchants. | Add `includeUnapproved=true` query param restricted to ADMIN, and dedicated approve/reject endpoints. | Test merchant creation -> pending view in admin -> admin approval -> shop discoverable. |
| **ISS-IMG-01** | **P1 (High)** | Image Upload Handler (`/api/v1/upload`) | Uploaded images return 404 Not Found immediately upon upload. | Uploaded images are served with HTTP 200 and render in storefronts and product cards. | `path.join(process.cwd(), "apps", "web", "public", "uploads")` resolves to `apps/web/apps/web/public/uploads` when dev/prod is started in `apps/web`. | Normalize upload directory resolution to check if `process.cwd()` ends in `apps/web`, and add dynamic asset fallback route. | Upload 1MB image -> assert HTTP 200 on returned URL. |
| **ISS-NAV-01** | **P1 (High)** | Routing & Auth Navigation (`apps/web`) | Multi-second page switching, screen flickering, and hydration lag. | Instant client-side page transitions under 300ms. | Usage of `window.location.href = ...` forcing full browser reloads, combined with uncached `api.getMe()` calls on every layout mount. | Replace `window.location.href` with Next.js App Router `router.push()`, optimize React Query cache headers (`staleTime: 60s`). | Measure transition time between `/customer` and `/customer/orders`. |
| **ISS-MAP-01** | **P2 (Medium)** | Map & Tracking (`RouteMap.tsx`) | Displays static SVG placeholder or gray box. | Displays interactive map of Khammam with actual merchant and customer pins. | Dependency on `NEXT_PUBLIC_MAPBOX_TOKEN` which is unconfigured. | Implement Leaflet / OpenStreetMap zero-key tile provider with Khammam coordinate anchors (17.2473° N, 80.1514° E). | Load tracking screen and verify tile rendering. |
| **ISS-CAT-01** | **P2 (Medium)** | Customer Marketplace (`/customer/explore`) | Products and shops have mismatched or hardcoded categories. | Dynamic category tabs matching actual database categories with live count badges. | Hardcoded category arrays in UI out of sync with database merchant and product categories. | Add `/api/v1/categories` endpoint aggregating distinct active categories from database. | Select each category filter and verify filtered results. |
| **ISS-UI-01** | **P3 (Low)** | UI Components & Typography | Varying button heights (36px to 52px), inconsistent modal paddings. | Strict compliance with 48px touch targets, unified Geist typography, and design tokens. | Divergent Tailwind classes across legacy and new screens. | Refactor component primitives to use unified design tokens from `AGENTS.md`. | Visual inspection against 48px touch target rule. |

---

## 2. DETAILED ROOT CAUSE ANALYSES WITH CODE EVIDENCE

### 2.1 Security P0: Missing Server-Side Middleware
- **Evidence**: `apps/web/middleware.ts` does not exist.
- **Runtime Verification**: An unauthenticated HTTP request:
  ```http
  GET /admin HTTP/1.1
  Host: localhost:3000
  ```
  Returns `HTTP/1.1 200 OK` with 4,742ms render time and outputs the full administrative layout markup before any client code executes.
- **Vulnerability**: Unauthorized actors or scrapers can inspect layout structures and potentially leak unrendered static props.

### 2.2 Merchant Visibility & Shop Creation Deadlock
- **Evidence**: `apps/web/app/api/v1/merchants/route.ts` line 28:
  ```sql
  WHERE m.is_active = true AND (m.is_approved IS TRUE OR m.is_approved IS NULL)
  ```
- **Evidence**: `apps/web/app/api/v1/merchants/onboarding/route.ts` line 143:
  ```sql
  INSERT INTO public.merchants (..., is_approved, is_active)
  VALUES (..., false, false)
  ```
- **The Defect**: The admin dashboard at `/admin/merchants` invokes `GET /api/v1/merchants`. Because the API unconditionally filters out `is_approved = false`, pending applications are completely hidden from administrators. No approve button exists in the admin UI, locking all new merchants out of the platform permanently.

### 2.3 Image Upload Directory Misalignment
- **Evidence**: `apps/web/app/api/v1/upload/route.ts` line 82:
  ```typescript
  const uploadsDir = path.join(process.cwd(), "apps", "web", "public", "uploads");
  ```
- **The Defect**: In standard npm execution (`cd apps/web && npm run dev`), `process.cwd()` is already `C:\...\apps\web`. The code then appends `apps\web\public\uploads`, creating a double-nested directory:
  `C:\...\apps\web\apps\web\public\uploads`.
  The browser requests `http://localhost:3000/uploads/<filename>`, which Next.js resolves from `C:\...\apps\web\public\uploads`. The files existed in the phantom directory, yielding universal 404s.

### 2.4 Slow Page Navigation
- **Evidence**: `apps/web/app/login/page.tsx` line 112:
  ```typescript
  window.location.href = redirectUrl;
  ```
- **Evidence**: `apps/web/components/layout/admin-layout.tsx` lines 32–45:
  Blocking `api.getMe()` call inside `useEffect` on every route mount, combined with Next.js development-mode on-demand compilation of 900+ modules per route.

### 2.5 Map Failure
- **Evidence**: `apps/web/components/ui/route-map.tsx`:
  Checks for `process.env.NEXT_PUBLIC_MAPBOX_TOKEN`. When undefined, it renders a dummy canvas with static lines. No tile server or coordinates are rendered.

---

## 3. EXTERNAL CREDENTIALS & PROVIDER REQUIREMENTS

| Provider | Purpose | Status | Workaround / Solution |
|---|---|---|---|
| **Mapbox / Google Maps** | Dynamic street map tiles | Not configured | **Resolved without keys**: Use Leaflet with OpenStreetMap / CartoDB tiles (free, open, high-resolution for Khammam). |
| **SMS Gateway (Fast2SMS / Twilio)** | Phone OTP login | Blocked per AGENTS.md | Email/Password auth and local development OTP simulator (in-memory verification for testing). |
| **AWS S3 / Supabase Storage** | Cloud asset storage | Optional | Persistent local public uploads directory with dynamic streaming route fallback (`/api/v1/uploads/[filename]`). |

---

## 4. PROPOSED MINIMAL CORRECTION PLAN (PHASED EXECUTION)

### Phase 1: P0 Security & Authorization Enforcement
1. Create `apps/web/middleware.ts` running on Next.js Edge runtime.
2. Intercept `/admin/:path*`, `/merchant/:path*`, `/partner/:path*`, `/customer/:path*`.
3. Verify GoTrue session cookie (`sb-access-token` / `session`).
4. Redirect unauthorized requests to `/login?redirect=...` with HTTP 307.

### Phase 2: P1 Merchant Creation & Approval Lifecycle
1. Update `GET /api/v1/merchants` to accept `includeUnapproved=true` (verified for ADMIN role).
2. Create `POST /api/v1/admin/merchants/[id]/approve` and `reject` route handlers.
3. Update `/admin/merchants/page.tsx` with a "Pending Review" tab, shop details inspection, and one-click Approval button.
4. Verify that approving a merchant immediately reflects in the Customer explore page.

### Phase 3: P1 Image Upload & Persistent Display
1. Correct directory resolution in `/api/v1/upload/route.ts` to detect whether `process.cwd()` already includes `apps/web`.
2. Add a dynamic route handler `apps/web/app/uploads/[filename]/route.ts` as a reliable fallback to serve images regardless of build-time asset caching.
3. Add resilient `onError` fallback handlers with category-specific SVG placeholders on all image components.

### Phase 4: P1 Performance & Navigation Overhaul
1. Replace all remaining instances of `window.location.href` with Next.js `router.push()`.
2. Optimize React Query configuration with 60-second `staleTime` for user profile and notifications.
3. Introduce pagination (`limit`, `offset`) on `/api/v1/merchants` and `/api/v1/products`.

### Phase 5: P1 Dynamic Marketplace Discovery & Categories
1. Implement dynamic category aggregation from active database items.
2. Provide synchronized filtering across Restaurants, Groceries, Dairy, Produce, Sweets, and Bakery in Khammam.

### Phase 6: P2 Zero-Key Interactive Map Integration
1. Implement OpenStreetMap tiles via Leaflet in `RouteMap.tsx`.
2. Anchor coordinates to Khammam (Wyra Road, Bus Stand, Gandhi Chowk, Mayuri Centre).

### Phase 7: Demo Data Quarantine & Clean Production Mode
1. Separate test fixtures from live production views.
2. Label any remaining demonstration indicators clearly per AGENTS.md rules.

### Phase 8: Final Verification & Test Suite Execution
1. Run full Vitest suite (176 tests).
2. Add end-to-end regression tests verifying middleware 307 redirects, merchant approval workflow, and image serving.

