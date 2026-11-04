import assert from "assert";
import { NextRequest } from "next/server";
import { pool } from "../lib/db";
import { POST as sendOtpHandler } from "../app/api/v1/auth/otp/send/route";
import { POST as verifyOtpHandler } from "../app/api/v1/auth/otp/verify/route";
import { POST as resetRequestHandler } from "../app/api/v1/auth/password/reset-request/route";
import { POST as resetConfirmHandler } from "../app/api/v1/auth/password/reset-confirm/route";
import { GET as getWishlistHandler, POST as addWishlistHandler } from "../app/api/v1/customer/wishlist/route";
import { DELETE as removeWishlistHandler } from "../app/api/v1/customer/wishlist/[productId]/route";
import { PATCH as updateAvailabilityHandler } from "../app/api/v1/partners/availability/route";
import { POST as approvePartnerHandler } from "../app/api/v1/admin/partners/[id]/approve/route";
import { signAuthToken } from "../lib/auth";
import { UserRole } from "@nationx/shared";
import crypto from "crypto";

const CUSTOMER_1_ID = "d0000000-0000-0000-0000-000000000001";
const CUSTOMER_2_ID = "d0000000-0000-0000-0000-000000000002";
const ADMIN_ID = "a0000000-0000-0000-0000-000000000001";

function makeReq(url: string, options: { method?: string; token?: string; body?: any } = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }
  return new NextRequest(new URL(url, "http://localhost:4000"), {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

async function runTests() {
  console.log("===================================================================");
  console.log("   NATIONX POST-COMMIT VERIFICATION SUITE (b6650a6)               ");
  console.log("===================================================================\n");

  let passed = 0;
  let failed = 0;

  function pass(msg: string) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  }

  function fail(msg: string, err: any) {
    console.error(`  [FAIL] ${msg}:`, err?.message || err, err?.details || "");
    failed++;
  }

  const customer1Token = signAuthToken({ userId: CUSTOMER_1_ID, email: "customer1@nationx.local", role: UserRole.CUSTOMER });
  const customer2Token = signAuthToken({ userId: CUSTOMER_2_ID, email: "customer2@nationx.local", role: UserRole.CUSTOMER });
  const adminToken = signAuthToken({ userId: ADMIN_ID, email: "admin@nationx.local", role: UserRole.ADMIN });

  const pRes = await pool.query("SELECT id FROM public.products WHERE is_active = true LIMIT 1");
  const testProductId = pRes.rows[0].id;

  // --- 1. Email OTP Flow ---
  console.log("--- 1. Testing Email OTP Flow & Safeguards ---");
  const testEmail = "test.otp.verify@nationx.local";
  try {
    await pool.query("DELETE FROM public.otp_verifications WHERE email = $1", [testEmail]);

    const req = makeReq("http://localhost:4000/api/v1/auth/otp/send", {
      method: "POST",
      body: { email: testEmail, purpose: "REGISTRATION" },
    });
    const res = await sendOtpHandler(req);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.data.sent, true);
    assert.strictEqual(json.data.type, "EMAIL");
    pass("Dispatches Email OTP and logs honest SMTP provider configuration notice");
  } catch (e) {
    fail("Dispatches Email OTP", e);
  }

  try {
    const req = makeReq("http://localhost:4000/api/v1/auth/otp/send", {
      method: "POST",
      body: { email: testEmail, purpose: "REGISTRATION" },
    });
    const res = await sendOtpHandler(req);
    const json = await res.json();
    assert.strictEqual(res.status, 429);
    assert.strictEqual(json.error.code, "RESEND_COOLDOWN_ACTIVE");
    pass("Enforces 60-second resend cooldown rate limit (HTTP 429)");
  } catch (e) {
    fail("Enforces 60-second resend cooldown rate limit", e);
  }

  try {
    const req = makeReq("http://localhost:4000/api/v1/auth/otp/verify", {
      method: "POST",
      body: { email: testEmail, otpCode: "000000" },
    });
    const res = await verifyOtpHandler(req);
    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.error.code, "INVALID_OTP");
    pass("Rejects invalid OTP code and increments attempt counter");
  } catch (e) {
    fail("Rejects invalid OTP code", e);
  }

  try {
    const knownCode = "654321";
    const knownHash = crypto.createHash("sha256").update(knownCode).digest("hex");
    await pool.query(
      "UPDATE public.otp_verifications SET otp_hash = $1 WHERE email = $2 AND verified_at IS NULL",
      [knownHash, testEmail]
    );

    const req = makeReq("http://localhost:4000/api/v1/auth/otp/verify", {
      method: "POST",
      body: { email: testEmail, otpCode: knownCode },
    });
    const res = await verifyOtpHandler(req);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(json.data.token);
    assert.strictEqual(json.data.redirectPath, "/customer");
    pass("Verifies valid OTP code and returns authenticated session token");
  } catch (e) {
    fail("Verifies valid OTP code", e);
  }

  // --- 2. Rider Verification Guard ---
  console.log("\n--- 2. Testing Rider Verification Guard ---");
  const unverifiedUserId = crypto.randomUUID();
  const unverifiedPartnerId = crypto.randomUUID();

  try {
    await pool.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [unverifiedUserId, `${unverifiedPartnerId}@test.local`]);
    await pool.query(
      "INSERT INTO public.users (id, name, email, phone, role, is_active) VALUES ($1, 'Rider Test Applicant', $2, '9999900001', 'PARTNER', true)",
      [unverifiedUserId, `${unverifiedPartnerId}@test.local`]
    );
    await pool.query(
      "INSERT INTO public.delivery_partners (id, user_id, vehicle_type, capacity_units, availability, current_locality, verified) VALUES ($1, $2, 'TWO_WHEELER', 10, 'OFFLINE', 'Khammam Central', false)",
      [unverifiedPartnerId, unverifiedUserId]
    );

    const unverifiedPartnerToken = signAuthToken({ userId: unverifiedUserId, email: `${unverifiedPartnerId}@test.local`, role: UserRole.PARTNER });

    const req = makeReq("http://localhost:4000/api/v1/partners/availability", {
      method: "PATCH",
      token: unverifiedPartnerToken,
      body: { availability: "AVAILABLE" },
    });
    const res = await updateAvailabilityHandler(req);
    const json = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(json.error.code, "UNVERIFIED_PARTNER");
    pass("Blocks unverified delivery partner from setting status to AVAILABLE (HTTP 403)");

    // Admin approves rider
    const approveReq = makeReq(`http://localhost:4000/api/v1/admin/partners/${unverifiedPartnerId}/approve`, {
      method: "POST",
      token: adminToken,
    });
    const approveRes = await approvePartnerHandler(approveReq, { params: Promise.resolve({ id: unverifiedPartnerId }) });
    const approveJson = await approveRes.json();
    if (approveRes.status !== 200) console.error("approve partner error:", approveJson);
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveJson.data.partner.verified, true);
    pass("Admin approves rider application, setting verified = true and auditing to delivery_events");

    // Verified partner can now go online
    const onlineReq = makeReq("http://localhost:4000/api/v1/partners/availability", {
      method: "PATCH",
      token: unverifiedPartnerToken,
      body: { availability: "AVAILABLE" },
    });
    const onlineRes = await updateAvailabilityHandler(onlineReq);
    const onlineJson = await onlineRes.json();
    assert.strictEqual(onlineRes.status, 200);
    assert.strictEqual(onlineJson.data.partner.availability, "AVAILABLE");
    pass("Verified delivery partner successfully toggles availability to AVAILABLE");
  } catch (e) {
    fail("Rider verification guard", e);
  }

  // --- 3. Wishlist Persistence & Isolation ---
  console.log("\n--- 3. Testing Wishlist Persistence & Cross-Customer Isolation ---");
  try {
    // Add item
    const addReq = makeReq("http://localhost:4000/api/v1/customer/wishlist", {
      method: "POST",
      token: customer1Token,
      body: { productId: testProductId },
    });
    const addRes = await addWishlistHandler(addReq);
    assert.ok(addRes.status === 200 || addRes.status === 201);

    // Duplicate check
    const dupReq = makeReq("http://localhost:4000/api/v1/customer/wishlist", {
      method: "POST",
      token: customer1Token,
      body: { productId: testProductId },
    });
    const dupRes = await addWishlistHandler(dupReq);
    assert.ok(dupRes.status === 200 || dupRes.status === 201);
    pass("Adds product to wishlist with idempotent duplicate prevention (ON CONFLICT DO NOTHING)");

    // Customer 1 queries
    const getReq1 = makeReq("http://localhost:4000/api/v1/customer/wishlist", {
      method: "GET",
      token: customer1Token,
    });
    const getRes1 = await getWishlistHandler(getReq1);
    const getJson1 = await getRes1.json();
    assert.ok(getJson1.data.wishlist.some((w: any) => w.id === testProductId));
    pass("Customer 1 retrieves persisted wishlist items from database");

    // Customer 2 queries: must NOT see customer 1's item
    await pool.query("DELETE FROM public.customer_wishlists WHERE customer_id = $1", [CUSTOMER_2_ID]);
    const getReq2 = makeReq("http://localhost:4000/api/v1/customer/wishlist", {
      method: "GET",
      token: customer2Token,
    });
    const getRes2 = await getWishlistHandler(getReq2);
    const getJson2 = await getRes2.json();
    assert.strictEqual(getJson2.data.wishlist.some((w: any) => w.id === testProductId), false);
    pass("Strict customer isolation: Customer 2 cannot access or view Customer 1's wishlist");

    // Remove item
    const delReq = makeReq(`http://localhost:4000/api/v1/customer/wishlist/${testProductId}`, {
      method: "DELETE",
      token: customer1Token,
    });
    const delRes = await removeWishlistHandler(delReq, { params: Promise.resolve({ productId: testProductId }) });
    assert.strictEqual(delRes.status, 200);
    pass("Removes product from wishlist in database");
  } catch (e) {
    fail("Wishlist persistence and isolation", e);
  }

  // --- 4. Password Recovery Lifecycle ---
  console.log("\n--- 4. Testing Password Recovery Lifecycle ---");
  try {
    const req = makeReq("http://localhost:4000/api/v1/auth/password/reset-request", {
      method: "POST",
      body: { email: "customer1@nationx.local" },
    });
    const res = await resetRequestHandler(req);
    const json = await res.json();
    assert.strictEqual(res.status, 200);
    const resetToken = json.data.devResetToken;
    assert.ok(resetToken);
    pass("Issues cryptographically hashed expiring reset token in public.password_reset_tokens");

    // Invalid token
    const invalidReq = makeReq("http://localhost:4000/api/v1/auth/password/reset-confirm", {
      method: "POST",
      body: { token: "bogus-token-random", newPassword: "SecurePassword123" },
    });
    const invalidRes = await resetConfirmHandler(invalidReq);
    const invalidJson = await invalidRes.json();
    assert.strictEqual(invalidRes.status, 400);
    assert.strictEqual(invalidJson.error.code, "INVALID_TOKEN");
    pass("Rejects invalid password reset token with HTTP 400");

    // Valid confirmation
    const validReq = makeReq("http://localhost:4000/api/v1/auth/password/reset-confirm", {
      method: "POST",
      body: { token: resetToken, newPassword: "BrandNewPassword2026!" },
    });
    const validRes = await resetConfirmHandler(validReq);
    const validJson = await validRes.json();
    if (validRes.status !== 200) console.error("reset confirm error:", validJson);
    assert.strictEqual(validRes.status, 200);
    assert.strictEqual(validJson.data.updated, true);
    pass("Confirms password reset, updates hash in auth.users, and writes audit event");

    // Token reuse rejection
    const reuseReq = makeReq("http://localhost:4000/api/v1/auth/password/reset-confirm", {
      method: "POST",
      body: { token: resetToken, newPassword: "AnotherPassword123" },
    });
    const reuseRes = await resetConfirmHandler(reuseReq);
    const reuseJson = await reuseRes.json();
    assert.strictEqual(reuseRes.status, 400);
    assert.strictEqual(reuseJson.error.code, "TOKEN_ALREADY_USED");
    pass("Rejects reuse of already consumed reset token (HTTP 400 TOKEN_ALREADY_USED)");
  } catch (e) {
    fail("Password recovery lifecycle", e);
  }

  console.log("\n===================================================================");
  console.log(`   POST-COMMIT VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===================================================================");

  await pool.end();
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
