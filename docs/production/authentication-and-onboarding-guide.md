# NationX Project 03 — Authentication & Onboarding Architecture Guide

**System:** Shared Delivery & Logistics Engine (Piloted in Khammam, Telangana)  
**Specification:** `project_3.pdf`, Version 2.0  
**Stack:** Next.js 15.5 App Router, Supabase Auth (GoTrue), PostgreSQL 16 with RLS  
**Document Status:** Production Operational Manual  

---

## 1. Architectural Principles

In accordance with Section 2 of `AGENTS.md` and the Foundation Shared Authentication mandate:
1. **Single Source of Identity:** Supabase Auth (`GoTrue`) is the authoritative authentication authority. Standalone custom JWT issuance or redundant password hash storage is strictly prohibited.
2. **Account vs. Entity Distinction:** Creating a login account in `auth.users` and `public.users` is decoupled from business entity approval:
   - **Customer:** Immediate access upon registration to place orders and manage wishlists.
   - **Merchant:** Account created first; shop application (`public.merchants` with `is_approved = false`) requires administrative review before becoming discoverable in the marketplace.
   - **Delivery Partner:** Account created first; partner profile (`public.delivery_partners` with `verified = false`) requires administrator verification before the rider can toggle status to `AVAILABLE`.
3. **No Fake Reality:** Simulated SMS delivery or fake verification is forbidden. Honest provider notices are displayed until compliant third-party gateways are integrated.

---

## 2. Google OAuth 2.0 Integration

### 2.1 Google Cloud Platform (GCP) Configuration
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Click **Create Credentials** -> **OAuth Client ID**.
3. Set **Application Type** to **Web application**.
4. Name the client: `NationX Logistics Khammam Web Client`.
5. Set **Authorized JavaScript origins**:
   - Development: `http://localhost:4000`
   - Production: `https://<your-production-domain>.vercel.app`
6. Set **Authorized redirect URIs**:
   - Development / Supabase GoTrue endpoint:
     `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
   - Local development callback:
     `http://localhost:4000/auth/callback`
   - Production web callback:
     `https://<your-production-domain>.vercel.app/auth/callback`
7. Save and copy the generated **Client ID** and **Client Secret**.

### 2.2 Supabase Dashboard Configuration
1. Open your Supabase Project Dashboard -> **Authentication** -> **Providers** -> **Google**.
2. Toggle **Enable Google provider** to ON.
3. Paste the **Client ID** and **Client Secret** obtained from GCP.
4. Under **Authentication** -> **URL Configuration**:
   - Set **Site URL** to `http://localhost:4000` (or your production URL).
   - Add to **Redirect URLs**:
     * `http://localhost:4000/auth/callback`
     * `https://<your-production-domain>.vercel.app/auth/callback`
5. Click **Save**.

### 2.3 Runtime Execution Flow
1. User clicks **"Continue with Google"** on `/login` or `/register`.
2. Client calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ... } })`.
3. User completes OAuth consent on Google.
4. Google redirects to `https://<ref>.supabase.co/auth/v1/callback`, which exchanges the authorization code for GoTrue session tokens.
5. GoTrue redirects back to `apps/web/app/auth/callback/route.ts`.
6. The callback route ensures:
   - A matching record exists in `public.users` (created or linked via email).
   - Secure session cookies are issued (`sb-access-token`, `sb-refresh-token`).
   - Role-based redirect routes the user directly to `/customer`, `/merchant`, `/partner`, or `/admin`.

---

## 3. Email & Password Authentication

### 3.1 Security & Validation Constraints
- **Minimum Length:** 8 characters.
- **Complexity:** Requires at least one alphabetical letter and one numeric digit.
- **Input Sanitization:** Email addresses and whitespace are automatically trimmed and lowercased.
- **User Interface:** Show/Hide password toggles (`Eye` / `EyeOff`) are provided on all password fields.

### 3.2 Registration Endpoint (`POST /api/v1/auth/register`)
- Validates request payload using Zod.
- Checks `public.users` and `auth.users` for duplicate email addresses.
- Generates an authoritative UUID and hashes credentials securely.
- Automatically initializes customer delivery address in `public.customer_addresses` if provided.
- Establishes a session cookie for instant onboarding.

### 3.3 Password Reset Flow
- **Request Link:** `/forgot-password` triggers an email reset token.
- **Reset Form:** `/reset-password?token=...` allows password entry with live confirmation check.
- **API Confirmation:** `POST /api/v1/auth/password/reset-confirm` updates the password in `auth.users` and revokes invalid tokens.

---

## 4. Phone OTP Gateway (SMS) Integration Guide

### 4.1 Current Status: Safely Gated
In accordance with Rule 5 of `AGENTS.md` ("No Fake Reality") and Section 2 ("Authentication: Phone OTP is BLOCKED until a compliant SMS gateway provider is formally approved and integrated"):
- The login interface explicitly displays an honest notice indicating that SMS OTP is undergoing regulatory carrier compliance.
- No fake simulated OTPs are displayed or mocked.

### 4.2 Requirements for Production Activation
To enable Indian mobile OTP verification in compliance with TRAI (Telecom Regulatory Authority of India) and DLT (Distributed Ledger Technology):
1. **Entity & Header Registration:** Complete Entity Registration on an Indian Telecom DLT portal (e.g. Jio, Airtel, Vodafone Idea, or BSNL) and obtain an approved Principal Entity ID (PE ID) and Sender Header (e.g. `NATXLG`).
2. **Template Registration:** Register Content Template IDs for OTP messages with exact static and variable text:
   `Your NationX Khammam verification code is {#var#}. Valid for 10 minutes. Do not share.`
3. **Gateway Provider:** Obtain production API credentials from an approved SMS gateway:
   - **Supported Options:** MSG91, Twilio India DLT, Gupshup, or Exotel.
4. **Environment Variables:** Populate in `.env.production`:
   ```bash
   SMS_GATEWAY_PROVIDER="MSG91" # or TWILIO, GUPSHUP
   SMS_GATEWAY_AUTH_KEY="your-gateway-auth-key"
   SMS_DLT_PE_ID="your-dlt-principal-entity-id"
   SMS_DLT_TEMPLATE_ID="your-registered-template-id"
   ```
5. **Activation:** Remove the maintenance notice in `apps/web/app/login/page.tsx` and enable direct OTP submission to `POST /api/v1/auth/phone/send-otp`.

---

## 5. Merchant & Delivery Partner Onboarding Lifecycle

### 5.1 Merchant Onboarding Pipeline
```
[ Step 1: User Account Creation ]
        │
        ▼
[ Step 2: Multi-Step Shop Application ]
   - Basic Info & Store Name
   - Category & Operating Hours
   - Location Selection via Interactive Leaflet Map (Wyra Road, Mamata Belt, etc.)
   - FSSAI / GSTIN / Trade Registration Details
        │
        ▼
[ Status: UNDER_REVIEW ] (is_approved = false)
        │
        ▼
[ Administrator Verification ]
   - Admin reviews application at /admin/merchants/[id]
   - Admin approves (POST /api/v1/admin/merchants/[id]/approve)
   - Store becomes discoverable in customer marketplace & inventory active
```

### 5.2 Delivery Partner (Rider) Onboarding Pipeline
```
[ Step 1: Rider Account Registration ]
   - Full legal name, mobile number, driving license number
   - Vehicle type (Two-Wheeler / Scooter)
   - Initial service zone (Khammam Central / Sector 01)
        │
        ▼
[ Status: UNDER_REVIEW ] (verified = false, availability = 'OFFLINE')
        │
        ▼
[ Administrator Verification ]
   - Admin reviews rider at /admin/partners/[partnerId]
   - Admin clicks "Approve & Authorize Partner" (POST /api/v1/admin/partners/[id]/approve)
   - Audit event logged to public.delivery_events
   - Partner notified in app and authorized to toggle status to 'AVAILABLE'
```

---

## 6. Verification Checklist
| Test / Inspection Point | Verification Method | Expected Outcome |
|---|---|---|
| Google Sign-In | Click "Continue with Google" | Directs to Google OAuth with valid redirect |
| Customer Registration | Submit `/register` form | Account created, session cookie set, redirected to `/customer` |
| Invalid Password | Password without number | Blocked by client and API validation |
| Interactive Map Picker | Drag marker on `/register/shop` | Coordinates and 12km zone update accurately |
| Product Media Resilience | Load broken image URL | Clean SVG fallback rendered without crashing |
| Partner Verification | Admin approves rider | `verified = true`, rider can go online |
| Customer Privacy | Inspect other customer's order | Blocked by PostgreSQL RLS with 403 / zero rows |
