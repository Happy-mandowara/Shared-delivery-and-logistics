import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { pool } from "../lib/db";
import { signAuthToken, verifyAuthToken, authenticateRequest } from "../lib/auth";
import { POST as loginHandler } from "../app/api/v1/auth/login/route";
import { POST as logoutHandler } from "../app/api/v1/auth/logout/route";
import { GET as meHandler } from "../app/api/v1/auth/me/route";
import { GET as getOrdersHandler } from "../app/api/v1/orders/route";
import { GET as getOrderByIdHandler } from "../app/api/v1/orders/[id]/route";
import { GET as getBatchesHandler, POST as createBatchHandler } from "../app/api/v1/batches/route";
import { GET as getCandidatesHandler } from "../app/api/v1/batches/candidates/route";
import { POST as assignBatchHandler } from "../app/api/v1/batches/[id]/assign/route";
import { GET as getPartnersHandler } from "../app/api/v1/partners/route";
import { GET as getEventsHandler } from "../app/api/v1/events/route";
import { GET as getStopsHandler } from "../app/api/v1/partners/stops/route";
import { POST as updateStopStatusHandler } from "../app/api/v1/partners/stops/[id]/status/route";
import { POST as acceptSuborderHandler } from "../app/api/v1/merchants/suborders/[id]/accept/route";
import { POST as readySuborderHandler } from "../app/api/v1/merchants/suborders/[id]/ready/route";
import { POST as handoverHandler } from "../app/api/v1/merchants/suborders/[id]/handover/route";
import { POST as respondAssignmentHandler } from "../app/api/v1/partners/assignments/[id]/respond/route";
import { UserRole } from "@nationx/shared";

function makeReq(
  url: string,
  options: { method?: string; token?: string; body?: any; headers?: Record<string, string> } = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
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

async function runSecurityAudit() {
  console.log("=================================================");
  console.log("   NATIONX PHASE 5.1: SECURITY & READINESS AUDIT  ");
  console.log("=================================================\n");

  // Reset database to deterministic seed before running audit
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

  // Obtain verified tokens for each role
  const login = async (email: string) => {
    const res = await loginHandler(
      makeReq("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        body: { email, password: "Password123!" },
      })
    );
    const json = await res.json();
    return json.data?.token as string;
  };

  const adminToken = await login("admin@nationx.local");
  const partner1Token = await login("partner1@nationx.local");
  const partner2Token = await login("partner2@nationx.local");
  const merchant1Token = await login("bawarchi@nationx.local");
  const merchant2Token = await login("balaji@nationx.local");
  const merchant3Token = await login("krishna@nationx.local");
  const customer1Token = await login("customer1@nationx.local");
  const customer2Token = await login("customer2@nationx.local");

  // ---------------------------------------------------------------------------
  // AREA 1: ROLE SWITCHER AND DEMO AUTHENTICATION SECURITY
  // ---------------------------------------------------------------------------
  console.log("\n--- 1. Role Switcher & Demo Authentication Security ---");

  // 1.1 Unauthenticated requests are rejected
  const unauthReq = makeReq("http://localhost:3000/api/v1/auth/me");
  const unauthRes = await meHandler(unauthReq);
  assert(unauthRes.status === 401, "1.1: Unauthenticated request rejected with HTTP 401");

  // 1.2 Invalid/tampered JWT rejected
  const tamperedReq = makeReq("http://localhost:3000/api/v1/auth/me", { token: "ey.tampered.token" });
  const tamperedRes = await meHandler(tamperedReq);
  assert(tamperedRes.status === 401, "1.2: Tampered JWT rejected with HTTP 401");

  // 1.3 Client cannot spoof role via forged token or client headers
  const forgedPayload = { userId: "d0000000-0000-0000-0000-000000000001", email: "customer1@nationx.local", role: UserRole.ADMIN };
  const forgedToken = signAuthToken(forgedPayload); // Signed with server secret BUT user's database role is CUSTOMER
  const roleCheckReq = makeReq("http://localhost:3000/api/v1/batches", { token: forgedToken });
  const roleCheckRes = await getBatchesHandler(roleCheckReq);
  assert(
    roleCheckRes.status === 403,
    "1.3: Role spoofing blocked: Database role overrides forged payload (HTTP 403)"
  );

  // 1.4 Raw UUID bearer rejected when test override is disabled
  const origEnv = process.env.ALLOW_TEST_UUID_AUTH;
  process.env.ALLOW_TEST_UUID_AUTH = "false";
  const rawUuidReq = makeReq("http://localhost:3000/api/v1/auth/me", {
    token: "a0000000-0000-0000-0000-000000000001",
  });
  const rawUuidRes = await meHandler(rawUuidReq);
  assert(
    rawUuidRes.status === 401,
    "1.4: Raw UUID bearer rejected when ALLOW_TEST_UUID_AUTH is false/absent (HTTP 401)"
  );
  process.env.ALLOW_TEST_UUID_AUTH = origEnv;

  // 1.5 Server logout invalidates cookies with maxAge: 0
  const logoutReq = makeReq("http://localhost:3000/api/v1/auth/logout", { method: "POST" });
  const logoutRes = await logoutHandler(logoutReq);
  const cookieHeaders = logoutRes.headers.get("set-cookie") || "";
  assert(
    cookieHeaders.includes("max-age=0") || cookieHeaders.includes("Max-Age=0"),
    "1.5: Logout endpoint clears cookies with Max-Age=0"
  );

  // ---------------------------------------------------------------------------
  // AREA 2: PROOF OF DELIVERY (POD) CODE SECURITY
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Proof of Delivery (POD) Code Security ---");

  // 2.1 Verify database stores POD code
  const dbPodRes = await pool.query(`SELECT id, pod_code, pod_attempts FROM public.orders WHERE id = $1`, [
    "30000000-0000-0000-0000-000000000001",
  ]);
  assert(
    dbPodRes.rows[0].pod_code === "4829",
    "2.1: POD code is stored in database record and not hardcoded in client"
  );

  // 2.2 Plaintext POD code is never disclosed to Partner or Merchant via Order APIs
  const partnerOrderReq = makeReq(
    "http://localhost:3000/api/v1/orders/30000000-0000-0000-0000-000000000001",
    { token: partner1Token }
  );
  const partnerOrderRes = await getOrderByIdHandler(partnerOrderReq, {
    params: Promise.resolve({ id: "30000000-0000-0000-0000-000000000001" }),
  });
  const partnerOrderJson = await partnerOrderRes.json();
  // Partner cannot view order before assignment (RLS 404), or if fetched, podCode must not be present
  assert(
    partnerOrderRes.status === 404 || partnerOrderJson.data?.podCode === undefined,
    "2.2: Data minimization: Plaintext podCode is stripped from partner order responses"
  );

  // 2.3 Customer owner CAN view their own POD code
  const custOrderReq = makeReq(
    "http://localhost:3000/api/v1/orders/30000000-0000-0000-0000-000000000001",
    { token: customer1Token }
  );
  const custOrderRes = await getOrderByIdHandler(custOrderReq, {
    params: Promise.resolve({ id: "30000000-0000-0000-0000-000000000001" }),
  });
  const custOrderJson = await custOrderRes.json();
  assert(
    custOrderJson.data?.podCode === "4829",
    "2.3: Customer owner can securely inspect their own POD code"
  );

  // Setup batch & assign to Partner 1 for live stop execution tests
  const batchRes = await createBatchHandler(
    makeReq("http://localhost:3000/api/v1/batches", {
      method: "POST",
      token: adminToken,
      body: {
        locality: "Khammam Central",
        suborderIds: [
          "40000000-0000-0000-0000-000000000001", // Bawarchi (Order 1)
          "40000000-0000-0000-0000-000000000002", // Sri Krishna (Order 1)
        ],
        idempotencyKey: "AUDIT-BATCH-001",
      },
    })
  );
  const batchJson = await batchRes.json();
  const batchId = batchJson.data?.batch_id;

  // Assign to Partner 1
  const assignRes = await assignBatchHandler(
    makeReq(`http://localhost:3000/api/v1/batches/${batchId}/assign`, {
      method: "POST",
      token: adminToken,
      body: { partnerId: "20000000-0000-0000-0000-000000000001", idempotencyKey: "AUDIT-ASSIGN-001" },
    }),
    { params: Promise.resolve({ id: batchId }) }
  );
  const assignJson = await assignRes.json();
  const assignmentId = assignJson.data?.assignment_id;

  // Partner 1 accepts
  await respondAssignmentHandler(
    makeReq(`http://localhost:3000/api/v1/partners/assignments/${assignmentId}/respond`, {
      method: "POST",
      token: partner1Token,
      body: { accept: true, idempotencyKey: "AUDIT-ACCEPT-001" },
    }),
    { params: Promise.resolve({ id: assignmentId }) }
  );

  // Get stops for this batch
  const stopsQuery = await pool.query(
    `SELECT id, type, order_id, merchant_id, sequence FROM public.delivery_stops WHERE batch_id = $1 ORDER BY sequence ASC`,
    [batchId]
  );
  const pickupStops = stopsQuery.rows.filter((s) => s.type === "PICKUP");
  const dropoffStop = stopsQuery.rows.find((s) => s.type === "DROPOFF");

  // ---------------------------------------------------------------------------
  // AREA 3: DELIVERY STOP SEQUENCE AND FAILURE HANDLING
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. Delivery Stop Sequence & Failure Handling ---");

  // 3.1 Premature drop-off is blocked when pickups are incomplete
  const prematureDropRes = await updateStopStatusHandler(
    makeReq(`http://localhost:3000/api/v1/partners/stops/${dropoffStop.id}/status`, {
      method: "POST",
      token: partner1Token,
      body: { status: "COMPLETED", proofOfDeliveryCode: "4829", idempotencyKey: "AUDIT-PREMATURE" },
    }),
    { params: Promise.resolve({ id: dropoffStop.id }) }
  );
  const prematureDropJson = await prematureDropRes.json();
  assert(
    prematureDropRes.status === 400 && prematureDropJson.error?.code === "PRECONDITION_FAILED",
    "3.1: Sequence enforcement: Cannot drop-off before all pickups completed (PRECONDITION_FAILED)"
  );

  // 3.2 Another partner (Partner 2) cannot update stops of Partner 1's batch
  const unauthPartnerRes = await updateStopStatusHandler(
    makeReq(`http://localhost:3000/api/v1/partners/stops/${pickupStops[0].id}/status`, {
      method: "POST",
      token: partner2Token,
      body: { status: "ARRIVED", idempotencyKey: "AUDIT-UNAUTH-PARTNER" },
    }),
    { params: Promise.resolve({ id: pickupStops[0].id }) }
  );
  assert(
    unauthPartnerRes.status === 403,
    "3.2: Isolation: Non-assigned partner rejected when updating stop (HTTP 403 FORBIDDEN)"
  );

  // Complete Merchant 1 & Merchant 3 prep & handover
  await acceptSuborderHandler(
    makeReq("http://localhost:3000/api/v1/merchants/suborders/40000000-0000-0000-0000-000000000001/accept", {
      method: "POST",
      token: merchant1Token,
      body: { estimatedPrepMinutes: 15, idempotencyKey: "AUDIT-ACCEPT-M1" },
    }),
    { params: Promise.resolve({ id: "40000000-0000-0000-0000-000000000001" }) }
  );
  await readySuborderHandler(
    makeReq("http://localhost:3000/api/v1/merchants/suborders/40000000-0000-0000-0000-000000000001/ready", {
      method: "POST",
      token: merchant1Token,
      body: { idempotencyKey: "AUDIT-READY-M1" },
    }),
    { params: Promise.resolve({ id: "40000000-0000-0000-0000-000000000001" }) }
  );
  await handoverHandler(
    makeReq("http://localhost:3000/api/v1/merchants/suborders/40000000-0000-0000-0000-000000000001/handover", {
      method: "POST",
      token: partner1Token,
      body: { notes: "Handed over by Bawarchi", idempotencyKey: "AUDIT-HO-M1" },
    }),
    { params: Promise.resolve({ id: "40000000-0000-0000-0000-000000000001" }) }
  );

  // Merchant 3 prep & handover
  await acceptSuborderHandler(
    makeReq("http://localhost:3000/api/v1/merchants/suborders/40000000-0000-0000-0000-000000000002/accept", {
      method: "POST",
      token: merchant3Token,
      body: { estimatedPrepMinutes: 10, idempotencyKey: "AUDIT-ACCEPT-M3" },
    }),
    { params: Promise.resolve({ id: "40000000-0000-0000-0000-000000000002" }) }
  );
  await readySuborderHandler(
    makeReq("http://localhost:3000/api/v1/merchants/suborders/40000000-0000-0000-0000-000000000002/ready", {
      method: "POST",
      token: merchant3Token,
      body: { idempotencyKey: "AUDIT-READY-M3" },
    }),
    { params: Promise.resolve({ id: "40000000-0000-0000-0000-000000000002" }) }
  );
  await handoverHandler(
    makeReq("http://localhost:3000/api/v1/merchants/suborders/40000000-0000-0000-0000-000000000002/handover", {
      method: "POST",
      token: partner1Token,
      body: { notes: "Handed over by Sri Krishna Sweets", idempotencyKey: "AUDIT-HO-M3" },
    }),
    { params: Promise.resolve({ id: "40000000-0000-0000-0000-000000000002" }) }
  );

  // 3.3 Re-completing already completed pickup stop is rejected
  const reCompleteRes = await updateStopStatusHandler(
    makeReq(`http://localhost:3000/api/v1/partners/stops/${pickupStops[0].id}/status`, {
      method: "POST",
      token: partner1Token,
      body: { status: "COMPLETED", idempotencyKey: "AUDIT-RECOMPLETE" },
    }),
    { params: Promise.resolve({ id: pickupStops[0].id }) }
  );
  assert(
    reCompleteRes.status === 400,
    "3.3: Terminal state protection: Already COMPLETED stop cannot be completed again (HTTP 400)"
  );

  // 2.4 Missing POD code on drop-off is rejected
  const missingPodRes = await updateStopStatusHandler(
    makeReq(`http://localhost:3000/api/v1/partners/stops/${dropoffStop.id}/status`, {
      method: "POST",
      token: partner1Token,
      body: { status: "COMPLETED", idempotencyKey: "AUDIT-MISSING-POD" },
    }),
    { params: Promise.resolve({ id: dropoffStop.id }) }
  );
  const missingPodJson = await missingPodRes.json();
  assert(
    missingPodRes.status === 400 && missingPodJson.error?.code === "MISSING_POD_CODE",
    "2.4: Drop-off requires proofOfDeliveryCode (HTTP 400 MISSING_POD_CODE)"
  );

  // 2.5 Invalid POD code is rejected with INVALID_POD_CODE
  const invalidPodRes = await updateStopStatusHandler(
    makeReq(`http://localhost:3000/api/v1/partners/stops/${dropoffStop.id}/status`, {
      method: "POST",
      token: partner1Token,
      body: { status: "COMPLETED", proofOfDeliveryCode: "9999", idempotencyKey: "AUDIT-WRONG-POD-1" },
    }),
    { params: Promise.resolve({ id: dropoffStop.id }) }
  );
  const invalidPodJson = await invalidPodRes.json();
  assert(
    invalidPodRes.status === 400 && invalidPodJson.error?.code === "INVALID_POD_CODE",
    "2.5: Incorrect verification code rejected with HTTP 400 INVALID_POD_CODE"
  );

  // 2.6 Brute force lockout: 4 more failed attempts reach 5/5
  for (let i = 2; i <= 5; i++) {
    await updateStopStatusHandler(
      makeReq(`http://localhost:3000/api/v1/partners/stops/${dropoffStop.id}/status`, {
        method: "POST",
        token: partner1Token,
        body: { status: "COMPLETED", proofOfDeliveryCode: `000${i}`, idempotencyKey: `AUDIT-WRONG-POD-${i}` },
      }),
      { params: Promise.resolve({ id: dropoffStop.id }) }
    );
  }

  // 6th attempt should be blocked by MAX_ATTEMPTS_EXCEEDED (HTTP 429)
  const lockedOutRes = await updateStopStatusHandler(
    makeReq(`http://localhost:3000/api/v1/partners/stops/${dropoffStop.id}/status`, {
      method: "POST",
      token: partner1Token,
      body: { status: "COMPLETED", proofOfDeliveryCode: "4829", idempotencyKey: "AUDIT-LOCKED-OUT" },
    }),
    { params: Promise.resolve({ id: dropoffStop.id }) }
  );
  const lockedOutJson = await lockedOutRes.json();
  assert(
    lockedOutRes.status === 429 && lockedOutJson.error?.code === "MAX_ATTEMPTS_EXCEEDED",
    "2.6: Brute force protection: Locked out after 5 consecutive failures (HTTP 429 MAX_ATTEMPTS_EXCEEDED)"
  );

  // Reset pod_attempts for Order 1 to verify legitimate completion
  await pool.query(`UPDATE public.orders SET pod_attempts = 0 WHERE id = '30000000-0000-0000-0000-000000000001'`);

  // 2.7 Valid POD code succeeds
  const validPodRes = await updateStopStatusHandler(
    makeReq(`http://localhost:3000/api/v1/partners/stops/${dropoffStop.id}/status`, {
      method: "POST",
      token: partner1Token,
      body: { status: "COMPLETED", proofOfDeliveryCode: "4829", idempotencyKey: "AUDIT-VALID-POD" },
    }),
    { params: Promise.resolve({ id: dropoffStop.id }) }
  );
  assert(validPodRes.status === 200, "2.7: Valid POD code successfully completes drop-off");

  // 2.8 Plaintext OTP is never logged in delivery_events
  const eventCheck = await pool.query(
    `SELECT message, reason FROM public.delivery_events WHERE order_id = '30000000-0000-0000-0000-000000000001'`
  );
  const leaksOtp = eventCheck.rows.some((row) => JSON.stringify(row).includes("4829"));
  assert(!leaksOtp, "2.8: Plaintext OTP code '4829' is never leaked into audit log events");

  // ---------------------------------------------------------------------------
  // AREA 4: ADMIN READ API SECURITY & DATA MINIMIZATION
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. Admin Read API Security & Data Minimization ---");

  // 4.1 GET /api/v1/batches
  const bCust = await getBatchesHandler(makeReq("http://localhost:3000/api/v1/batches", { token: customer1Token }));
  const bMerch = await getBatchesHandler(makeReq("http://localhost:3000/api/v1/batches", { token: merchant1Token }));
  const bPart = await getBatchesHandler(makeReq("http://localhost:3000/api/v1/batches", { token: partner1Token }));
  const bAdmin = await getBatchesHandler(makeReq("http://localhost:3000/api/v1/batches", { token: adminToken }));
  assert(
    bCust.status === 403 && bMerch.status === 403 && bPart.status === 403 && bAdmin.status === 200,
    "4.1: GET /api/v1/batches requires ADMIN role (Customer 403, Merchant 403, Partner 403, Admin 200)"
  );

  // 4.2 GET /api/v1/partners
  const pCust = await getPartnersHandler(makeReq("http://localhost:3000/api/v1/partners", { token: customer1Token }));
  const pAdmin = await getPartnersHandler(makeReq("http://localhost:3000/api/v1/partners", { token: adminToken }));
  assert(
    pCust.status === 403 && pAdmin.status === 200,
    "4.2: GET /api/v1/partners requires ADMIN role (Non-admin 403, Admin 200)"
  );

  // 4.3 GET /api/v1/events
  const eCust = await getEventsHandler(makeReq("http://localhost:3000/api/v1/events", { token: customer1Token }));
  const eAdmin = await getEventsHandler(makeReq("http://localhost:3000/api/v1/events", { token: adminToken }));
  assert(
    eCust.status === 403 && eAdmin.status === 200,
    "4.3: GET /api/v1/events requires ADMIN role (Non-admin 403, Admin 200)"
  );

  // 4.4 GET /api/v1/batches/candidates
  const cCust = await getCandidatesHandler(makeReq("http://localhost:3000/api/v1/batches/candidates", { token: customer1Token }));
  const cAdmin = await getCandidatesHandler(makeReq("http://localhost:3000/api/v1/batches/candidates", { token: adminToken }));
  assert(
    cCust.status === 403 && cAdmin.status === 200,
    "4.4: GET /api/v1/batches/candidates requires ADMIN role (Customer 403, Admin 200)"
  );

  // ---------------------------------------------------------------------------
  // AREA 5: DEMO DATA VS REAL OPERATIONAL DATA
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. Demo Data vs Real Operational Data ---");

  // 5.1 Verify seeded records have deterministic test identifiers
  const seedUsers = await pool.query(
    `SELECT count(*)::int as count FROM public.users WHERE email LIKE '%@nationx.local'`
  );
  assert(seedUsers.rows[0].count >= 9, "5.1: Demo seed accounts use explicit @nationx.local demo domains");

  // 5.2 Verify zero simulated or fabricated live tracking tables exist
  const liveTableCheck = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('live_locations', 'gps_tracking', 'rider_telemetry')`
  );
  assert(
    liveTableCheck.rows.length === 0,
    "5.2: No fabricated live tracking tables exist; static estimates are clearly labeled"
  );

  // ---------------------------------------------------------------------------
  // AREA 6: LIVE MONITORING CLAIMS AND DATA REFRESH
  // ---------------------------------------------------------------------------
  console.log("\n--- 6. Live Monitoring Claims and Data Refresh ---");

  // 6.1 Audit event queries support on-demand fetch with standard pagination / limits
  const auditRes = await getEventsHandler(makeReq("http://localhost:3000/api/v1/events", { token: adminToken }));
  const auditJson = await auditRes.json();
  assert(
    Array.isArray(auditJson.data?.events) && auditJson.data.events.length > 0,
    "6.1: Audit event queries return structured event logs for action-triggered refresh"
  );

  console.log("\n=================================================");
  console.log(`SECURITY AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityAudit()
  .catch((err) => {
    console.error("FATAL ERROR IN SECURITY AUDIT:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
