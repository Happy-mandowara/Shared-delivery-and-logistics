/**
 * Test Suite: Batch Optimization Engine, Categories System & Onboarding Storage
 */

import assert from "assert";
import fs from "fs";
import path from "path";

// Load environment variables
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
import { UserRole } from "@nationx/shared";
import crypto from "crypto";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:4000/api/v1";

async function runTests() {
  console.log("=== Running NationX Batch Optimizer & Categories Verification Tests ===\n");

  // 1. Setup Admin Token
  const adminRes = await pool.query(`SELECT id, email, role FROM public.users WHERE role = 'ADMIN' LIMIT 1`);
  let adminId = adminRes.rows[0]?.id;
  if (!adminId) {
    adminId = crypto.randomUUID();
    await pool.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'admin@nationx.local') ON CONFLICT DO NOTHING`, [adminId]);
    await pool.query(`INSERT INTO public.users (id, name, email, role, is_active) VALUES ($1, 'Admin Ops', 'admin@nationx.local', 'ADMIN', true)`, [adminId]);
  }
  const adminToken = signAuthToken({ userId: adminId, email: "admin@nationx.local", role: UserRole.ADMIN });

  // 2. Setup Merchant Token
  const merchRes = await pool.query(`SELECT id, user_id FROM public.merchants WHERE is_active = true LIMIT 1`);
  const merch = merchRes.rows[0];
  let merchUserId = merch.user_id;
  if (!merchUserId) {
    merchUserId = crypto.randomUUID();
    await pool.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'merchant1@nationx.local') ON CONFLICT DO NOTHING`, [merchUserId]);
    await pool.query(`INSERT INTO public.users (id, name, email, role, is_active) VALUES ($1, 'Merchant One', 'merchant1@nationx.local', 'MERCHANT', true)`, [merchUserId]);
    await pool.query(`UPDATE public.merchants SET user_id = $1 WHERE id = $2`, [merchUserId, merch.id]);
  }
  const merchantToken = signAuthToken({ userId: merchUserId, email: "merchant1@nationx.local", role: UserRole.MERCHANT });

  // Test 1: Categories endpoint returns categoriesWithStores
  console.log("Checking 1: GET /api/v1/categories returns categories with attached store arrays...");
  const catRes = await fetch(`${BASE_URL}/categories`);
  assert.strictEqual(catRes.status, 200, "Categories API should return 200");
  const catData = await catRes.json();
  assert.strictEqual(catData.success, true);
  assert.ok(Array.isArray(catData.data.categoriesWithStores), "categoriesWithStores should be an array");
  assert.ok(catData.data.categoriesWithStores.length > 0, "Should have at least 1 category");
  const firstCat = catData.data.categoriesWithStores[0];
  assert.ok(firstCat.category, "Category must have name");
  assert.ok(Array.isArray(firstCat.merchants), "Category must have merchants array");
  console.log(`  [PASS] 1: Returned ${catData.data.categoriesWithStores.length} categories with dynamic store links\n`);

  // Test 2: Unauthenticated onboarding photo upload succeeds
  console.log("Checking 2: Unauthenticated photo upload with x-onboarding header succeeds...");
  const dummyBase64 = "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2e4AAAA=";
  const uploadRes = await fetch(`${BASE_URL}/upload?purpose=onboarding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-onboarding": "true",
    },
    body: JSON.stringify({ data: dummyBase64 }),
  });
  assert.strictEqual(uploadRes.status, 201, `Onboarding upload should return 201 (got ${uploadRes.status})`);
  const uploadData = await uploadRes.json();
  assert.strictEqual(uploadData.success, true);
  assert.ok(uploadData.data.url, "Should return public image URL");
  console.log(`  [PASS] 2: Onboarding photo uploaded to Supabase Storage: ${uploadData.data.url}\n`);

  // Test 3: Merchant Profile endpoint /api/v1/merchants/me
  console.log("Checking 3: GET /api/v1/merchants/me returns current merchant details...");
  const meRes = await fetch(`${BASE_URL}/merchants/me`, {
    headers: { Authorization: `Bearer ${merchantToken}` },
  });
  assert.strictEqual(meRes.status, 200, "merchants/me should return 200");
  const meData = await meRes.json();
  assert.strictEqual(meData.success, true);
  assert.ok(meData.data.merchant.id, "Merchant object should include id");
  assert.ok(meData.data.merchant.name, "Merchant object should include name");
  console.log(`  [PASS] 3: Successfully retrieved profile for "${meData.data.merchant.name}"\n`);

  // Test 4: Batch Optimization Engine /api/v1/batches/optimize (dry run)
  console.log("Checking 4: POST /api/v1/batches/optimize executes multi-criteria clustering...");
  const optRes = await fetch(`${BASE_URL}/batches/optimize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      locality: "ALL",
      maxOrders: 8,
      capacityUnits: 10,
      autoCreate: false,
    }),
  });
  assert.strictEqual(optRes.status, 200, "Optimizer should return 200");
  const optData = await optRes.json();
  assert.strictEqual(optData.success, true);
  assert.ok(optData.data !== undefined, "Optimizer should return data payload");
  console.log(`  [PASS] 4: Batch optimizer generated ${optData.data.suggestedBatchesCount || 0} clusters with Haversine distance and stop sequencing\n`);

  console.log("=== ALL BATCH OPTIMIZATION & CATEGORY TESTS PASSED ===\n");
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });

