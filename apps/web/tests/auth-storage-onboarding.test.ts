/**
 * NATIONX PRODUCTION VERIFICATION: AUTHENTICATION, ONBOARDING & STORAGE PERSISTENCE TEST SUITE
 * 
 * Verifies:
 * 1. Authentication during onboarding across customer, merchant, partner roles.
 * 2. Upload to authoritative Supabase Storage bucket 'product-images' and HTTP public retrieval.
 * 3. PostgreSQL persistence of product images with camelCase & snake_case API aliases.
 * 4. Product update and image modification persistence.
 * 5. Onboarding draft saving and application submission without 'Missing authorization token'.
 */

import assert from "assert";
import fs from "fs";
import path from "path";

// Load environment variables for tsx standalone execution
for (const envFile of [
  path.resolve(__dirname, "../.env.local"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), ".env"),
]) {
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || "").trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

import { pool } from "../lib/db";
import { signAuthToken } from "../lib/auth";
import { createSupabaseAdminClient } from "../lib/supabase/server";
import { UserRole } from "@nationx/shared";
import crypto from "crypto";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:4000/api/v1";

async function runAuthStorageOnboardingTests() {
  console.log("=== Running NationX Auth, Onboarding & Product Image Persistence Tests ===\n");

  let adminToken: string;
  let merchantUserToken: string;
  let merchantId: string;
  let merchantUserId: string;
  let customerUserToken: string;
  let customerUserId: string;
  let uploadedImageUrl: string;
  let createdProductId: string;

  // 1. Setup Admin User & Token
  const adminRes = await pool.query(`SELECT id, email, role FROM public.users WHERE role = 'ADMIN' LIMIT 1`);
  let adminId = adminRes.rows[0]?.id;
  if (!adminId) {
    adminId = crypto.randomUUID();
    await pool.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'admin@nationx.local') ON CONFLICT DO NOTHING`, [adminId]);
    await pool.query(`INSERT INTO public.users (id, name, email, role, is_active) VALUES ($1, 'Admin Ops', 'admin@nationx.local', 'ADMIN', true)`, [adminId]);
  }
  adminToken = signAuthToken({ userId: adminId, email: "admin@nationx.local", role: UserRole.ADMIN });

  // 2. Setup Merchant User & Shop
  const merchantRes = await pool.query(`
    SELECT m.id, m.user_id, u.email 
    FROM public.merchants m 
    JOIN public.users u ON m.user_id = u.id 
    LIMIT 1
  `);
  if (merchantRes.rows.length > 0) {
    merchantId = merchantRes.rows[0].id;
    merchantUserId = merchantRes.rows[0].user_id;
    merchantUserToken = signAuthToken({ userId: merchantUserId, email: merchantRes.rows[0].email, role: UserRole.MERCHANT });
  } else {
    merchantUserId = crypto.randomUUID();
    merchantId = crypto.randomUUID();
    await pool.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'merchant_test@nationx.local') ON CONFLICT DO NOTHING`, [merchantUserId]);
    await pool.query(`INSERT INTO public.users (id, name, email, role, is_active) VALUES ($1, 'Test Merchant', 'merchant_test@nationx.local', 'MERCHANT', true)`, [merchantUserId]);
    await pool.query(`
      INSERT INTO public.merchants (id, user_id, name, code, category, address, locality, latitude, longitude, is_active, is_approved)
      VALUES ($1, $2, 'Khammam Test Foods', 'KTF1', 'Restaurants', 'Wyra Road, Khammam', 'Wyra Road', 17.2473, 80.1514, true, true)
    `, [merchantId, merchantUserId]);
    merchantUserToken = signAuthToken({ userId: merchantUserId, email: "merchant_test@nationx.local", role: UserRole.MERCHANT });
  }

  // 3. Setup Customer User & Token
  const customerRes = await pool.query(`SELECT id, email FROM public.users WHERE role = 'CUSTOMER' LIMIT 1`);
  if (customerRes.rows.length > 0) {
    customerUserId = customerRes.rows[0].id;
    customerUserToken = signAuthToken({ userId: customerUserId, email: customerRes.rows[0].email, role: UserRole.CUSTOMER });
  } else {
    customerUserId = crypto.randomUUID();
    await pool.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'customer_test@nationx.local') ON CONFLICT DO NOTHING`, [customerUserId]);
    await pool.query(`INSERT INTO public.users (id, name, email, role, is_active) VALUES ($1, 'Test Customer', 'customer_test@nationx.local', 'CUSTOMER', true)`, [customerUserId]);
    customerUserToken = signAuthToken({ userId: customerUserId, email: "customer_test@nationx.local", role: UserRole.CUSTOMER });
  }

  // TEST 1: Unauthenticated request rejection
  console.log("Checking A1: Unauthenticated rejection on /api/v1/upload...");
  const res1 = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: "invalid" }),
  });
  assert.strictEqual(res1.status, 401, "Expected 401 Unauthorized for unauthenticated request");
  const body1 = await res1.json();
  assert.strictEqual(body1.success, false);
  assert.ok(/Missing authorization token|Authentication required/i.test(body1.error?.message), "Expected auth error message");
  console.log("  [PASS] A1: Unauthenticated upload rejected with 401 Missing authorization token\n");

  // TEST 2: Authoritative Supabase Storage Bucket Existence
  console.log("Checking A2: Supabase Storage bucket 'product-images'...");
  const sbAdmin = createSupabaseAdminClient();
  assert.ok(sbAdmin, "Supabase Admin client must be initialized with credentials");
  const { data: buckets, error: bucketErr } = await sbAdmin.storage.listBuckets();
  assert.strictEqual(bucketErr, null, "Bucket listing should not error");
  const productBucket = buckets?.find((b: any) => b.id === "product-images" || b.name === "product-images");
  assert.ok(productBucket, "Bucket 'product-images' must exist in Supabase Storage");
  assert.strictEqual(productBucket?.public, true, "Bucket 'product-images' must be marked public: true");
  console.log("  [PASS] A2: Supabase Storage bucket 'product-images' exists, configured as public: true\n");

  // TEST 3: Image Upload & Storage Persistence via API
  console.log("Checking A3: Authenticated image upload to Supabase Storage...");
  // 1x1 transparent WebP base64 data URL
  const testWebpBase64 = "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2QAAAA==";
  const res3 = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${merchantUserToken}`,
    },
    body: JSON.stringify({
      data: testWebpBase64,
      fileName: "test-biryani.webp",
    }),
  });

  const body3 = await res3.json();
  console.log("res3 status:", res3.status, "body:", body3);
  assert.strictEqual(res3.status, 201, `Upload endpoint failed with status ${res3.status}`);
  assert.strictEqual(body3.success, true);
  assert.ok(body3.data?.url, "Response must include public URL");
  uploadedImageUrl = body3.data.url;
  console.log(`  Uploaded image URL: ${uploadedImageUrl}`);
  assert.ok(uploadedImageUrl.startsWith("http"), "Image URL must be absolute HTTP/HTTPS URL");

  // Verify image is downloadable via HTTP GET and returns 200 OK
  const getRes = await fetch(uploadedImageUrl);
  assert.strictEqual(getRes.status, 200, "Image URL must be reachable and return HTTP 200");
  const contentType = getRes.headers.get("content-type");
  assert.ok(contentType?.includes("image"), "Returned content-type must be an image MIME type");
  console.log("  [PASS] A3: Image uploaded to Supabase Storage and successfully downloaded via public HTTP\n");

  // TEST 4: Product Creation with Image Persistence in PostgreSQL
  console.log("Checking A4: Product creation with image persistence...");
  const productPayload = {
    name: "Special Khammam Gongura Chicken",
    category: "Restaurants",
    description: "Signature spicy Gongura chicken with traditional Andhra spices.",
    price: 280,
    unit: "plate",
    weight_grams: 450,
    handling_requirements: "HOT_FOOD",
    stock_status: "IN_STOCK",
    image_url: uploadedImageUrl,
    image_urls: [uploadedImageUrl],
  };

  const res4 = await fetch(`${BASE_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${merchantUserToken}`,
    },
    body: JSON.stringify(productPayload),
  });

  assert.strictEqual(res4.status, 201, `Product creation failed with status ${res4.status}`);
  const body4 = await res4.json();
  assert.strictEqual(body4.success, true);
  const prod = body4.data?.product;
  assert.ok(prod?.id, "Product must have an ID");
  createdProductId = prod.id;

  // Verify camelCase & snake_case aliases
  assert.strictEqual(prod.imageUrl, uploadedImageUrl, "imageUrl must match uploaded image");
  assert.strictEqual(prod.image_url, uploadedImageUrl, "image_url alias must match uploaded image");
  assert.ok(Array.isArray(prod.imageUrls) && prod.imageUrls[0] === uploadedImageUrl);
  assert.ok(Array.isArray(prod.image_urls) && prod.image_urls[0] === uploadedImageUrl);

  // Direct database query verification
  const dbRes = await pool.query(
    `SELECT id, image_url, image_urls, handling_tag, stock_status, weight_grams 
     FROM public.products 
     WHERE id = $1`,
    [createdProductId]
  );
  assert.strictEqual(dbRes.rows.length, 1);
  const dbRow = dbRes.rows[0];
  assert.strictEqual(dbRow.image_url, uploadedImageUrl, "PostgreSQL image_url must match");
  assert.ok(dbRow.image_urls.includes(uploadedImageUrl), "PostgreSQL image_urls array must contain uploaded URL");
  assert.strictEqual(dbRow.handling_tag, "HOT_FOOD", "PostgreSQL handling_tag must match");
  console.log("  [PASS] A4: Product created and image URLs persisted in PostgreSQL public.products\n");

  // TEST 5: GET /products and GET /products/[id]
  console.log("Checking A5: GET endpoints return normalized imageUrl and image_url...");
  const listRes = await fetch(`${BASE_URL}/products?merchantId=${merchantId}`);
  assert.strictEqual(listRes.status, 200);
  const listBody = await listRes.json();
  assert.strictEqual(listBody.success, true);
  const found = listBody.data?.products?.find((p: any) => p.id === createdProductId);
  assert.ok(found, "Created product must be present in merchant product list");
  assert.strictEqual(found.imageUrl, uploadedImageUrl);
  assert.strictEqual(found.image_url, uploadedImageUrl);

  const detailRes = await fetch(`${BASE_URL}/products/${createdProductId}`);
  assert.strictEqual(detailRes.status, 200);
  const detailBody = await detailRes.json();
  assert.strictEqual(detailBody.success, true);
  const detailProd = detailBody.data?.product;
  assert.strictEqual(detailProd.imageUrl, uploadedImageUrl);
  assert.strictEqual(detailProd.image_url, uploadedImageUrl);
  console.log("  [PASS] A5: Both GET /products and GET /products/[id] return normalized image URLs\n");

  // TEST 6: PATCH /products/[id] Updates Image
  console.log("Checking A6: PATCH product image update and persistence...");
  const secondWebp = "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2QAAAA==";
  const upRes = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${merchantUserToken}`,
    },
    body: JSON.stringify({
      data: secondWebp,
      fileName: "test-gongura-detail.webp",
    }),
  });
  const upBody = await upRes.json();
  const secondImageUrl = upBody.data?.url;
  assert.ok(secondImageUrl, "Second image upload must succeed");

  const patchRes = await fetch(`${BASE_URL}/products/${createdProductId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${merchantUserToken}`,
    },
    body: JSON.stringify({
      imageUrl: uploadedImageUrl,
      imageUrls: [uploadedImageUrl, secondImageUrl],
      price: 295,
    }),
  });

  assert.strictEqual(patchRes.status, 200);
  const patchBody = await patchRes.json();
  assert.strictEqual(patchBody.success, true);
  const updated = patchBody.data?.product;
  assert.strictEqual(updated.imageUrls.length, 2);
  assert.strictEqual(updated.image_urls.length, 2);
  assert.strictEqual(updated.price, 295);

  const checkDb = await pool.query(`SELECT image_urls FROM public.products WHERE id = $1`, [createdProductId]);
  assert.strictEqual(checkDb.rows[0].image_urls.length, 2);
  console.log("  [PASS] A6: Product image gallery updated and verified in PostgreSQL\n");

  // TEST 7: Merchant Onboarding Multi-Step Draft & Submission with Auth
  console.log("Checking A7: Merchant onboarding save draft and submission...");
  const onboardingRes = await fetch(`${BASE_URL}/merchants/onboarding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${merchantUserToken}`,
    },
    body: JSON.stringify({
      currentStep: 3,
      draftData: {
        shopName: "Khammam Central Bakery",
        category: "Bakeries",
        locality: "Wyra Road",
        starterProducts: [
          { name: "Egg Puff", price: 30, unit: "piece" }
        ]
      },
      submitApplication: false,
    }),
  });

  assert.strictEqual(onboardingRes.status, 200);
  const obBody = await onboardingRes.json();
  assert.strictEqual(obBody.success, true);
  assert.strictEqual(obBody.data?.saved, true);

  const getDraftRes = await fetch(`${BASE_URL}/merchants/onboarding`, {
    headers: { "Authorization": `Bearer ${merchantUserToken}` },
  });
  assert.strictEqual(getDraftRes.status, 200);
  const draftBody = await getDraftRes.json();
  assert.strictEqual(draftBody.success, true);
  assert.strictEqual(draftBody.data?.authenticated, true);
  assert.strictEqual(draftBody.data?.draft?.currentStep, 3);
  console.log("  [PASS] A7: Merchant onboarding draft saved and retrieved without authorization error\n");

  // TEST 8: Partner Registration Creates Audit Event
  console.log("Checking A8: Partner registration and audit logging...");
  const uniquePhone = "99" + Math.floor(10000000 + Math.random() * 90000000);
  const regRes = await fetch(`${BASE_URL}/partners/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Ramu Rider",
      phone: uniquePhone,
      drivingLicense: "TS-04-2024-998877",
      vehicleType: "TWO_WHEELER",
      locality: "Wyra Road",
    }),
  });

  assert.ok([200, 201].includes(regRes.status), `Expected 200 or 201, got ${regRes.status}`);
  const regBody = await regRes.json();
  assert.strictEqual(regBody.success, true);
  assert.ok(regBody.data?.partnerId);

  const auditRes = await pool.query(
    `SELECT message, reason FROM public.delivery_events WHERE reason = 'PARTNER_ONBOARDING' ORDER BY created_at DESC LIMIT 1`
  );
  assert.strictEqual(auditRes.rows.length, 1);
  assert.ok(auditRes.rows[0].message.includes("Ramu Rider"));
  console.log("  [PASS] A8: Partner registration logged to public.delivery_events audit table\n");

  console.log("=== ALL 8 AUTHENTICATION, ONBOARDING & STORAGE PERSISTENCE TESTS PASSED ===\n");
  await pool.end();
}

runAuthStorageOnboardingTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
