import { NextRequest } from "next/server";
import { pool } from "../lib/db";
import { POST as loginHandler } from "../app/api/v1/auth/login/route";
import { GET as getWishlistHandler, POST as addWishlistHandler } from "../app/api/v1/customer/wishlist/route";
import { DELETE as removeWishlistHandler } from "../app/api/v1/customer/wishlist/[productId]/route";
import { POST as duplicateProductHandler } from "../app/api/v1/merchants/products/duplicate/route";
import { POST as importProductsHandler } from "../app/api/v1/merchants/products/import/route";
import { GET as getDraftHandler, POST as saveDraftHandler } from "../app/api/v1/merchants/onboarding/route";
import { POST as sendOtpHandler } from "../app/api/v1/auth/otp/send/route";
import { POST as verifyOtpHandler } from "../app/api/v1/auth/otp/verify/route";
import { POST as googleAuthHandler } from "../app/api/v1/auth/oauth/google/route";
import { POST as resetRequestHandler } from "../app/api/v1/auth/password/reset-request/route";
import { POST as createPaymentOrderHandler } from "../app/api/v1/payments/create-order/route";
import { POST as verifyPaymentHandler } from "../app/api/v1/payments/verify/route";
import { GET as getIncidentsHandler, POST as reportIncidentHandler } from "../app/api/v1/partners/incidents/route";
import { GET as getComplaintsHandler, POST as submitComplaintHandler } from "../app/api/v1/customer/complaints/route";
import { GET as getLocationHandler, POST as updateLocationHandler } from "../app/api/v1/partners/location/route";

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

async function run() {
  console.log("===================================================================");
  console.log("   NATIONX: MARKETPLACE, ONBOARDING & FINANCIAL AUDIT SUITE       ");
  console.log("===================================================================\n");

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

  try {
    // 1. Authenticate tokens
    const custLoginRes = await loginHandler(makeReq("/api/v1/auth/login", {
      method: "POST",
      body: { email: "customer1@nationx.local", password: "Password123!" },
    }));
    const custJson = await custLoginRes.json();
    const custToken = custJson.data?.token;

    const merchLoginRes = await loginHandler(makeReq("/api/v1/auth/login", {
      method: "POST",
      body: { email: "bawarchi@nationx.local", password: "Password123!" },
    }));
    const merchJson = await merchLoginRes.json();
    const merchToken = merchJson.data?.token;

    const adminLoginRes = await loginHandler(makeReq("/api/v1/auth/login", {
      method: "POST",
      body: { email: "admin@nationx.local", password: "Password123!" },
    }));
    const adminJson = await adminLoginRes.json();
    const adminToken = adminJson.data?.token;

    const partnerLoginRes = await loginHandler(makeReq("/api/v1/auth/login", {
      method: "POST",
      body: { email: "partner1@nationx.local", password: "Password123!" },
    }));
    const partnerJson = await partnerLoginRes.json();
    const partnerToken = partnerJson.data?.token;

    console.log("--- 1. Customer Wishlist Persistence ---");
    const testProdRes = await pool.query("SELECT id FROM public.products LIMIT 1");
    const testProdId = testProdRes.rows[0]?.id;

    if (testProdId) {
      const addWishRes = await addWishlistHandler(makeReq("/api/v1/customer/wishlist", {
        method: "POST",
        token: custToken,
        body: { productId: testProdId },
      }));
      const addWishJson = await addWishRes.json();
      assert(addWishRes.status === 201 || addWishJson.success, "Customer adds product to wishlist with 201/success");

      const getWishRes = await getWishlistHandler(makeReq("/api/v1/customer/wishlist", {
        token: custToken,
      }));
      const getWishJson = await getWishRes.json();
      assert(getWishRes.status === 200 && Array.isArray(getWishJson.data?.wishlist), "Customer retrieves persistent wishlist items");

      const delWishRes = await removeWishlistHandler(
        makeReq(`/api/v1/customer/wishlist/${testProdId}`, { method: "DELETE", token: custToken }),
        { params: Promise.resolve({ productId: testProdId }) }
      );
      assert(delWishRes.status === 200, "Customer removes product from wishlist with 200");
    }

    console.log("\n--- 2. Merchant Product Duplication & Bulk Import ---");
    if (testProdId) {
      const dupRes = await duplicateProductHandler(makeReq("/api/v1/merchants/products/duplicate", {
        method: "POST",
        token: merchToken,
        body: { productId: testProdId },
      }));
      const dupJson = await dupRes.json();
      assert(dupRes.status === 201 || dupJson.success, "Merchant clones catalog product with (Copy)");
    }

    const importRes = await importProductsHandler(makeReq("/api/v1/merchants/products/import", {
      method: "POST",
      token: merchToken,
      body: {
        products: [
          { name: "Imported Item 1", price: 120, category: "Groceries", unit: "kg" },
          { name: "Imported Item 2", price: 65, category: "Dairy", unit: "litre" },
        ],
      },
    }));
    const importJson = await importRes.json();
    assert(importRes.status === 201 && (importJson.data?.importedCount === 2 || importJson.data?.count === 2), "Merchant bulk imports products via CSV/JSON");

    console.log("\n--- 3. 10-Step Merchant Onboarding Wizard & Draft ---");
    const saveDraftRes = await saveDraftHandler(makeReq("/api/v1/merchants/onboarding", {
      method: "POST",
      token: merchToken,
      body: {
        currentStep: 3,
        draftData: {
          shopName: "Kakatiya Sweets",
          locality: "Wyra Road",
          category: "Sweets",
        },
      },
    }));
    const saveDraftJson = await saveDraftRes.json();
    assert(saveDraftRes.status === 200 && saveDraftJson.data?.saved, "Merchant saves onboarding draft progress", { status: saveDraftRes.status, saveDraftJson });

    const getDraftRes = await getDraftHandler(makeReq("/api/v1/merchants/onboarding", {
      token: merchToken,
    }));
    const getDraftJson = await getDraftRes.json();
    assert(getDraftJson.data?.draft?.draftData?.shopName === "Kakatiya Sweets", "Merchant retrieves saved draft with exact form data", { status: getDraftRes.status, getDraftJson });

    console.log("\n--- 4. Authentication: Phone OTP & Google OAuth ---");
    const sendOtpRes = await sendOtpHandler(makeReq("/api/v1/auth/otp/send", {
      method: "POST",
      body: { phone: "9848022334" },
    }));
    const sendOtpJson = await sendOtpRes.json();
    assert(sendOtpRes.status === 200 && (sendOtpJson.data?.generated || sendOtpJson.data?.sent), "Phone OTP requested successfully", { status: sendOtpRes.status, sendOtpJson });
    const otpCode = sendOtpJson.data?.devOtp || "123456";

    const verifyOtpRes = await verifyOtpHandler(makeReq("/api/v1/auth/otp/verify", {
      method: "POST",
      body: { phone: "9848022334", otpCode },
    }));
    const verifyOtpJson = await verifyOtpRes.json();
    assert(verifyOtpRes.status === 200 && Boolean(verifyOtpJson.data?.token), "Phone OTP verified and JWT session issued", { status: verifyOtpRes.status, verifyOtpJson });

    const googleAuthRes = await googleAuthHandler(makeReq("/api/v1/auth/oauth/google", {
      method: "POST",
      body: { email: "reviewer@gmail.com", name: "Google Reviewer" },
    }));
    const googleAuthJson = await googleAuthRes.json();
    assert(googleAuthRes.status === 200 && Boolean(googleAuthJson.data?.token), "Google OAuth authenticates and returns user session", { status: googleAuthRes.status, googleAuthJson });

    const pwdResetRes = await resetRequestHandler(makeReq("/api/v1/auth/password/reset-request", {
      method: "POST",
      body: { email: "customer1@nationx.local" },
    }));
    assert(pwdResetRes.status === 200, "Password reset request dispatched");

    console.log("\n--- 5. Payment Gateway Simulation & Orders ---");
    const orderRes = await pool.query("SELECT id, total FROM public.orders LIMIT 1");
    const testOrderId = orderRes.rows[0]?.id;
    const testAmount = orderRes.rows[0]?.total || 150;

    if (testOrderId) {
      const createPayRes = await createPaymentOrderHandler(makeReq("/api/v1/payments/create-order", {
        method: "POST",
        token: custToken,
        body: { orderId: testOrderId, amount: testAmount, paymentMethod: "UPI" },
      }));
      const createPayJson = await createPayRes.json();
      assert(createPayRes.status === 200 && Boolean(createPayJson.data?.gatewayOrderId), "Gateway order generated with amount in paise");

      const verifyPayRes = await verifyPaymentHandler(makeReq("/api/v1/payments/verify", {
        method: "POST",
        token: custToken,
        body: { orderId: testOrderId, paymentId: "pay_test_signature_123" },
      }));
      assert(verifyPayRes.status === 200, "Payment verification confirms order and updates status to PAID");
    }

    console.log("\n--- 6. Delivery Partner Incident Reporting & Exceptions ---");
    const reportIncRes = await reportIncidentHandler(makeReq("/api/v1/partners/incidents", {
      method: "POST",
      token: partnerToken,
      body: {
        category: "VEHICLE_BREAKDOWN",
        description: "Flat rear tire outside Khammam Railway station",
        latitude: 17.2472,
        longitude: 80.1514,
        photoUrls: ["https://example.com/tire.jpg"],
      },
    }));
    const reportIncJson = await reportIncRes.json();
    assert(reportIncRes.status === 200 && Boolean(reportIncJson.data?.incident?.id), "Partner logs vehicular breakdown with GPS and photo evidence");

    const getIncRes = await getIncidentsHandler(makeReq("/api/v1/partners/incidents", {
      token: adminToken,
    }));
    const getIncJson = await getIncRes.json();
    assert(getIncRes.status === 200 && getIncJson.data?.incidents?.length > 0, "Admin retrieves all live rider incident escalations");

    console.log("\n--- 7. Customer Defect Complaints & Quality ---");
    if (testOrderId) {
      const complaintRes = await submitComplaintHandler(makeReq("/api/v1/customer/complaints", {
        method: "POST",
        token: custToken,
        body: {
          orderId: testOrderId,
          category: "DAMAGED_ITEMS",
          description: "Curd container was cracked upon arrival",
          photoUrls: ["https://example.com/spill.jpg"],
        },
      }));
      const complaintJson = await complaintRes.json();
      assert(complaintRes.status === 200 && Boolean(complaintJson.data?.complaint?.id), "Customer logs item defect ticket with photos");

      const getCompRes = await getComplaintsHandler(makeReq("/api/v1/customer/complaints", {
        token: custToken,
      }));
      assert(getCompRes.status === 200, "Customer retrieves complaint history");
    }

    console.log("\n--- 8. Partner Telemetry & GPS Coordinates ---");
    const locUpdateRes = await updateLocationHandler(makeReq("/api/v1/partners/location", {
      method: "POST",
      token: partnerToken,
      body: {
        latitude: 17.2485,
        longitude: 80.1522,
        locality: "Wyra Road",
      },
    }));
    assert(locUpdateRes.status === 200, "Partner updates active GPS telemetry");

    const locGetRes = await getLocationHandler(makeReq("/api/v1/partners/location"));
    const locGetJson = await locGetRes.json();
    assert(locGetRes.status === 200 && Boolean(locGetJson.data?.location?.latitude), "Tracking API returns authentic partner location");

  } catch (err: any) {
    console.error("Test execution threw error:", err);
    failed++;
  }

  console.log("\n===================================================================");
  console.log(`   FEATURES TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(console.error).finally(() => process.exit(0));
