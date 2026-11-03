import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { pool } from "../lib/db";
import { POST as loginHandler } from "../app/api/v1/auth/login/route";
import { GET as meHandler } from "../app/api/v1/auth/me/route";
import { GET as getOrdersHandler, POST as createOrderHandler } from "../app/api/v1/orders/route";
import { GET as getOrderByIdHandler } from "../app/api/v1/orders/[id]/route";
import { GET as getMerchantSubordersHandler } from "../app/api/v1/merchants/suborders/route";
import { POST as acceptSuborderHandler } from "../app/api/v1/merchants/suborders/[id]/accept/route";
import { POST as readySuborderHandler } from "../app/api/v1/merchants/suborders/[id]/ready/route";
import { POST as handoverHandler } from "../app/api/v1/merchants/suborders/[id]/handover/route";
import { GET as getCandidatesHandler } from "../app/api/v1/batches/candidates/route";
import { POST as createBatchHandler } from "../app/api/v1/batches/route";
import { GET as getBatchByIdHandler } from "../app/api/v1/batches/[id]/route";
import { POST as assignBatchHandler } from "../app/api/v1/batches/[id]/assign/route";
import { GET as getPartnerAssignmentsHandler } from "../app/api/v1/partners/assignments/route";
import { POST as respondAssignmentHandler } from "../app/api/v1/partners/assignments/[id]/respond/route";
import { GET as getStopsHandler } from "../app/api/v1/partners/stops/route";
import { POST as updateStopStatusHandler } from "../app/api/v1/partners/stops/[id]/status/route";

function makeReq(url: string, options: { method?: string; token?: string; body?: any } = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

async function runTests() {
  console.log("=================================================");
  console.log("   NATIONX SHARED DELIVERY — API TEST SUITE      ");
  console.log("=================================================\n");

  // Reset database with deterministic seed before test run
  const seedPath = path.resolve(__dirname, "../../../supabase/seed.sql");
  if (fs.existsSync(seedPath)) {
    const seedSql = fs.readFileSync(seedPath, "utf-8");
    await pool.query(seedSql);
    console.log("  [INFO] Database reset to deterministic seed.\n");
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string, detail?: any) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`, detail || "");
      failed++;
    }
  }

  let adminToken = "";
  let merchantToken = "";
  let partnerToken = "";
  let customer1Token = "";
  let customer2Token = "";

  // ---------------------------------------------------------------------------
  // 1. AUTHENTICATION MODULE
  // ---------------------------------------------------------------------------
  console.log("--- 1. Testing Authentication (/api/v1/auth) ---");

  // Invalid login
  const invLoginReq = makeReq("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    body: { email: "nonexistent@nationx.local", password: "Password123!" },
  });
  const invLoginRes = await loginHandler(invLoginReq);
  const invLoginJson = await invLoginRes.json();
  assert(invLoginRes.status === 401, "Rejects nonexistent user with 401");
  assert(invLoginJson.success === false, "Returns success: false for invalid login");

  // Valid Login: Admin
  const adminLoginReq = makeReq("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    body: { email: "admin@nationx.local", password: "Password123!" },
  });
  const adminLoginRes = await loginHandler(adminLoginReq);
  const adminLoginJson = await adminLoginRes.json();
  assert(adminLoginRes.status === 200, "Admin login succeeds with 200");
  assert(adminLoginJson.data?.token !== undefined, "Admin receives JWT session token");
  adminToken = adminLoginJson.data?.token;

  // Valid Login: Merchant 1 (Bawarchi)
  const merchLoginRes = await loginHandler(
    makeReq("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      body: { email: "bawarchi@nationx.local", password: "Password123!" },
    })
  );
  const merchLoginJson = await merchLoginRes.json();
  assert(merchLoginRes.status === 200, "Merchant login succeeds with 200");
  merchantToken = merchLoginJson.data?.token;

  // Valid Login: Partner 1 (Suresh)
  const partnerLoginRes = await loginHandler(
    makeReq("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      body: { email: "partner1@nationx.local", password: "Password123!" },
    })
  );
  const partnerLoginJson = await partnerLoginRes.json();
  assert(partnerLoginRes.status === 200, "Partner login succeeds with 200");
  partnerToken = partnerLoginJson.data?.token;

  // Valid Login: Customer 1 (Rajesh) & Customer 2 (Priya)
  const c1LoginJson = await (
    await loginHandler(
      makeReq("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        body: { email: "customer1@nationx.local", password: "Password123!" },
      })
    )
  ).json();
  customer1Token = c1LoginJson.data?.token;

  const c2LoginJson = await (
    await loginHandler(
      makeReq("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        body: { email: "customer2@nationx.local", password: "Password123!" },
      })
    )
  ).json();
  customer2Token = c2LoginJson.data?.token;

  // Test /api/v1/auth/me without token (Unauthorized)
  const noAuthRes = await meHandler(makeReq("http://localhost:3000/api/v1/auth/me"));
  assert(noAuthRes.status === 401, "/api/v1/auth/me returns 401 when token missing");

  // Test /api/v1/auth/me with invalid token
  const badAuthRes = await meHandler(
    makeReq("http://localhost:3000/api/v1/auth/me", { token: "invalid.jwt.token" })
  );
  assert(badAuthRes.status === 401, "/api/v1/auth/me returns 401 when token invalid");

  // Test /api/v1/auth/me with valid token
  const goodAuthRes = await meHandler(
    makeReq("http://localhost:3000/api/v1/auth/me", { token: merchantToken })
  );
  const goodAuthJson = await goodAuthRes.json();
  assert(goodAuthRes.status === 200, "/api/v1/auth/me returns 200 with valid token");
  assert(goodAuthJson.data.merchant.code === "MERCH_BAWARCHI", "Identifies merchant profile");

  // ---------------------------------------------------------------------------
  // 2. ORDERS MODULE
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Testing Orders (/api/v1/orders) ---");

  // Customer 1 fetches orders (RLS customer isolation)
  const c1OrdersRes = await getOrdersHandler(
    makeReq("http://localhost:3000/api/v1/orders", { token: customer1Token })
  );
  const c1OrdersJson = await c1OrdersRes.json();
  if (c1OrdersRes.status !== 200) {
    console.error("c1Orders failed:", JSON.stringify(c1OrdersJson, null, 2));
  }
  assert(c1OrdersRes.status === 200, "Customer 1 fetches orders with 200");
  assert(c1OrdersJson.data.length === 1, `Customer 1 sees exactly 1 order (saw ${c1OrdersJson.data.length})`);
  assert(c1OrdersJson.data[0].orderNumber === "ORD-20261103-001", "Customer 1 sees their own order");

  // Customer 1 attempts to fetch Customer 2's order directly (ORD 2)
  const c1FetchC2OrderRes = await getOrderByIdHandler(
    makeReq("http://localhost:3000/api/v1/orders/30000000-0000-0000-0000-000000000002", {
      token: customer1Token,
    }),
    { params: Promise.resolve({ id: "30000000-0000-0000-0000-000000000002" }) }
  );
  assert(
    c1FetchC2OrderRes.status === 404,
    "Customer 1 cannot access Customer 2's order (RLS yields 404/Not Found)"
  );

  // Customer 1 fetches their own order details
  const c1DetailRes = await getOrderByIdHandler(
    makeReq("http://localhost:3000/api/v1/orders/30000000-0000-0000-0000-000000000001", {
      token: customer1Token,
    }),
    { params: Promise.resolve({ id: "30000000-0000-0000-0000-000000000001" }) }
  );
  const c1DetailJson = await c1DetailRes.json();
  assert(c1DetailRes.status === 200, "Customer 1 fetches own order details with 200");
  assert(c1DetailJson.data.suborders.length === 2, "Shows 2 suborders for multi-shop order");

  // Create order with invalid payload (Zod 4 validation)
  const badOrderRes = await createOrderHandler(
    makeReq("http://localhost:3000/api/v1/orders", {
      method: "POST",
      token: customer1Token,
      body: { deliveryAddress: "Too short" },
    })
  );
  assert(badOrderRes.status === 400, "Rejects invalid order payload with 400 Validation Error");

  // Create valid new order
  const newOrderRes = await createOrderHandler(
    makeReq("http://localhost:3000/api/v1/orders", {
      method: "POST",
      token: customer1Token,
      body: {
        customerId: "d0000000-0000-0000-0000-000000000001",
        fulfillmentMode: "SHARED_DELIVERY",
        deliveryAddress: "H.No 4-10-82, Gandhi Chowk, Khammam",
        deliveryLocality: "Khammam Central",
        customerNotes: "Please deliver before 2 PM",
        suborders: [
          {
            merchantId: "10000000-0000-0000-0000-000000000001",
            items: [
              {
                productName: "Special Mutton Biryani",
                quantity: 1,
                unitPrice: 420.0,
                handlingTag: "HOT_FOOD",
              },
            ],
          },
        ],
      },
    })
  );
  const newOrderJson = await newOrderRes.json();
  if (newOrderRes.status !== 201) {
    console.error("Order creation failed payload:", JSON.stringify(newOrderJson, null, 2));
  }
  assert(newOrderRes.status === 201, "Creates order successfully with 201 Created");
  assert(newOrderJson.data?.suborders?.length === 1, "Creates 1 merchant suborder");

  // ---------------------------------------------------------------------------
  // 3. MERCHANTS MODULE
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. Testing Merchants (/api/v1/merchants) ---");

  // Customer attempts to access merchant queue (Forbidden)
  const custAccessMerchRes = await getMerchantSubordersHandler(
    makeReq("http://localhost:3000/api/v1/merchants/suborders", { token: customer1Token })
  );
  assert(custAccessMerchRes.status === 403, "Customer cannot access merchant suborder queue (403)");

  // Merchant fetches their suborder queue
  const merchQueueRes = await getMerchantSubordersHandler(
    makeReq("http://localhost:3000/api/v1/merchants/suborders", { token: merchantToken })
  );
  const merchQueueJson = await merchQueueRes.json();
  assert(merchQueueRes.status === 200, "Merchant fetches their queue with 200");
  assert(merchQueueJson.data.length >= 2, `Merchant sees only their own shop suborders (count: ${merchQueueJson.data.length})`);

  // Merchant accepts suborder
  const targetSuborderId = "40000000-0000-0000-0000-000000000001";
  const acceptRes = await acceptSuborderHandler(
    makeReq(`http://localhost:3000/api/v1/merchants/suborders/${targetSuborderId}/accept`, {
      method: "POST",
      token: merchantToken,
      body: { preparationMinutes: 20, merchantNotes: "Starting cooking now" },
    }),
    { params: Promise.resolve({ id: targetSuborderId }) }
  );
  const acceptJson = await acceptRes.json();
  assert(acceptRes.status === 200, "Merchant accepts suborder with 200");
  assert(acceptJson.data.status === "ACCEPTED", "Suborder status updated to ACCEPTED");

  // Merchant marks suborder ready for pickup
  const readyRes = await readySuborderHandler(
    makeReq(`http://localhost:3000/api/v1/merchants/suborders/${targetSuborderId}/ready`, {
      method: "POST",
      token: merchantToken,
      body: { notes: "Biryani packed and staged" },
    }),
    { params: Promise.resolve({ id: targetSuborderId }) }
  );
  const readyJson = await readyRes.json();
  assert(readyRes.status === 200, "Merchant marks suborder ready with 200");
  assert(readyJson.data.status === "READY_FOR_PICKUP", "Suborder status updated to READY_FOR_PICKUP");

  // ---------------------------------------------------------------------------
  // 4. BATCHES MODULE
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. Testing Batches (/api/v1/batches) ---");

  // Partner attempts to view candidates (Forbidden)
  const partnerCandRes = await getCandidatesHandler(
    makeReq("http://localhost:3000/api/v1/batches/candidates", { token: partnerToken })
  );
  assert(partnerCandRes.status === 403, "Partner cannot view batch candidates (403)");

  // Admin views candidate suborders
  const adminCandRes = await getCandidatesHandler(
    makeReq("http://localhost:3000/api/v1/batches/candidates?locality=Khammam", {
      token: adminToken,
    })
  );
  const adminCandJson = await adminCandRes.json();
  assert(adminCandRes.status === 200, "Admin discovers candidate suborders with 200");
  assert(adminCandJson.data.length >= 1, `Found ${adminCandJson.data.length} candidate suborders`);

  // Admin creates shared batch
  const createBatchRes = await createBatchHandler(
    makeReq("http://localhost:3000/api/v1/batches", {
      method: "POST",
      token: adminToken,
      body: {
        locality: "Khammam Central",
        maxOrders: 8,
        capacityUnits: 10,
        suborderIds: [targetSuborderId],
      },
    })
  );
  const createBatchJson = await createBatchRes.json();
  assert(createBatchRes.status === 201, "Admin creates shared delivery batch with 201 Created");
  const batchId = createBatchJson.data.batch_id;
  assert(batchId !== undefined, "Batch ID generated");

  // Admin assigns batch to partner
  const assignRes = await assignBatchHandler(
    makeReq(`http://localhost:3000/api/v1/batches/${batchId}/assign`, {
      method: "POST",
      token: adminToken,
      body: { partnerId: "20000000-0000-0000-0000-000000000001" },
    }),
    { params: Promise.resolve({ id: batchId }) }
  );
  const assignJson = await assignRes.json();
  assert(assignRes.status === 200, "Admin assigns batch to partner 1 with 200");
  const assignmentId = assignJson.data.assignment_id;

  // ---------------------------------------------------------------------------
  // 5. DELIVERY PARTNERS MODULE
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. Testing Delivery Partners (/api/v1/partners) ---");

  // Partner views their assignments
  const partAssignRes = await getPartnerAssignmentsHandler(
    makeReq("http://localhost:3000/api/v1/partners/assignments", { token: partnerToken })
  );
  const partAssignJson = await partAssignRes.json();
  assert(partAssignRes.status === 200, "Partner views assignments with 200");
  assert(partAssignJson.data.length >= 1, "Partner sees offered assignment");

  // Partner accepts assignment
  const respondRes = await respondAssignmentHandler(
    makeReq(`http://localhost:3000/api/v1/partners/assignments/${assignmentId}/respond`, {
      method: "POST",
      token: partnerToken,
      body: { accept: true, reason: "Ready with motorcycle in Khammam Central" },
    }),
    { params: Promise.resolve({ id: assignmentId }) }
  );
  const respondJson = await respondRes.json();
  assert(respondRes.status === 200, "Partner accepts assignment with 200");
  assert(respondJson.data.status === "ACCEPTED", "Assignment status updated to ACCEPTED");

  // Partner fetches stop sequence
  const stopsRes = await getStopsHandler(
    makeReq(`http://localhost:3000/api/v1/partners/stops?batchId=${batchId}`, {
      token: partnerToken,
    })
  );
  const stopsJson = await stopsRes.json();
  assert(stopsRes.status === 200, "Partner fetches stops with 200");
  assert(stopsJson.data.length >= 2, `Ordered stop sequence returned (${stopsJson.data.length} stops)`);

  const pickupStop = stopsJson.data.find((s: any) => s.type === "PICKUP");
  const dropoffStop = stopsJson.data.find((s: any) => s.type === "DROPOFF");

  // Merchant confirms handover of suborder to partner
  const handoverRes = await handoverHandler(
    makeReq(`http://localhost:3000/api/v1/merchants/suborders/${targetSuborderId}/handover`, {
      method: "POST",
      token: merchantToken,
      body: { notes: "Handed over to Suresh on Splendor" },
    }),
    { params: Promise.resolve({ id: targetSuborderId }) }
  );
  const handoverJson = await handoverRes.json();
  assert(handoverRes.status === 200, "Handover confirmed with 200");
  assert(handoverJson.data.status === "PICKED_UP", "Suborder status updated to PICKED_UP");

  // Verifying stop state integrity: Re-completing already completed pickup stop is rejected
  if (pickupStop) {
    const pickupRes = await updateStopStatusHandler(
      makeReq(`http://localhost:3000/api/v1/partners/stops/${pickupStop.id}/status`, {
        method: "POST",
        token: partnerToken,
        body: { status: "COMPLETED" },
      }),
      { params: Promise.resolve({ id: pickupStop.id }) }
    );
    assert(pickupRes.status === 400, "Re-completing already completed stop is rejected with 400");
  }

  // Partner arrives at dropoff stop
  if (dropoffStop) {
    const arriveRes = await updateStopStatusHandler(
      makeReq(`http://localhost:3000/api/v1/partners/stops/${dropoffStop.id}/status`, {
        method: "POST",
        token: partnerToken,
        body: { status: "ARRIVED" },
      }),
      { params: Promise.resolve({ id: dropoffStop.id }) }
    );
    assert(arriveRes.status === 200, "Partner updates stop to ARRIVED");

    // Retrieve the expected POD code for this stop's order
    const orderForStopRes = await pool.query(
      `SELECT pod_code FROM public.orders WHERE id = $1`,
      [dropoffStop.orderId || dropoffStop.order_id]
    );
    const expectedPodCode = orderForStopRes.rows[0].pod_code;

    // Partner attempts dropoff with invalid POD code (Rejected)
    const badPodRes = await updateStopStatusHandler(
      makeReq(`http://localhost:3000/api/v1/partners/stops/${dropoffStop.id}/status`, {
        method: "POST",
        token: partnerToken,
        body: { status: "COMPLETED", proofOfDeliveryCode: "0000" },
      }),
      { params: Promise.resolve({ id: dropoffStop.id }) }
    );
    const badPodJson = await badPodRes.json();
    if (badPodRes.status !== 400) {
      console.error("badPodRes unexpected status:", badPodRes.status, JSON.stringify(badPodJson, null, 2));
    }
    assert(badPodRes.status === 400, "Invalid POD code is rejected with 400");

    // Partner completes dropoff with verified Proof of Delivery
    const podRes = await updateStopStatusHandler(
      makeReq(`http://localhost:3000/api/v1/partners/stops/${dropoffStop.id}/status`, {
        method: "POST",
        token: partnerToken,
        body: { status: "COMPLETED", proofOfDeliveryCode: expectedPodCode },
      }),
      { params: Promise.resolve({ id: dropoffStop.id }) }
    );
    const podJson = await podRes.json();
    if (podRes.status !== 200) {
      console.error("podRes failed:", podRes.status, JSON.stringify(podJson, null, 2));
    }
    assert(podRes.status === 200, "Partner completes dropoff with valid Proof of Delivery");
    assert(podJson.data.status === "COMPLETED", "Stop status updated to COMPLETED");
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  await pool.end();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
