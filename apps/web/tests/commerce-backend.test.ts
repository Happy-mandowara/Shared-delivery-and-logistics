import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { pool } from "../lib/db";
import { POST as loginHandler } from "../app/api/v1/auth/login/route";
import { GET as getMerchantsHandler } from "../app/api/v1/merchants/route";
import { GET as getMerchantByIdHandler } from "../app/api/v1/merchants/[id]/route";
import {
  GET as getMerchantProductsHandler,
  POST as createMerchantProductHandler,
} from "../app/api/v1/merchants/[id]/products/route";
import { GET as getProductByIdHandler } from "../app/api/v1/products/[id]/route";
import {
  GET as getAddressesHandler,
  POST as createAddressHandler,
} from "../app/api/v1/customer/addresses/route";
import { GET as getNotificationsHandler } from "../app/api/v1/notifications/route";
import { PATCH as readNotificationHandler } from "../app/api/v1/notifications/[id]/read/route";
import { POST as readAllNotificationsHandler } from "../app/api/v1/notifications/read-all/route";
import { POST as createOrderHandler } from "../app/api/v1/orders/route";

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

async function runCommerceBackendTests() {
  console.log("===================================================================");
  console.log("   NATIONX PHASE 5.3A: COMMERCE BACKEND & NOTIFICATIONS TEST SUITE ");
  console.log("===================================================================\n");

  // Reset database with deterministic seed before test run
  const seedPath = path.resolve(__dirname, "../../../supabase/seed.sql");
  if (fs.existsSync(seedPath)) {
    const seedSql = fs.readFileSync(seedPath, "utf-8");
    await pool.query(seedSql);
    console.log("  [INFO] Database reset to deterministic Khammam seed.\n");
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

  // Tokens
  let adminToken = "";
  let bawarchiToken = "";
  let balajiToken = "";
  let customer1Token = "";
  let customer2Token = "";

  const BAWARCHI_MERCHANT_ID = "10000000-0000-0000-0000-000000000001";
  const BALAJI_MERCHANT_ID = "10000000-0000-0000-0000-000000000002";
  const KRISHNA_MERCHANT_ID = "10000000-0000-0000-0000-000000000003";

  const CUSTOMER_1_ID = "d0000000-0000-0000-0000-000000000001";

  // Login users
  const adminLogin = await (
    await loginHandler(
      makeReq("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        body: { email: "admin@nationx.local", password: "Password123!" },
      })
    )
  ).json();
  adminToken = adminLogin.data?.token;

  const bawarchiLogin = await (
    await loginHandler(
      makeReq("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        body: { email: "bawarchi@nationx.local", password: "Password123!" },
      })
    )
  ).json();
  bawarchiToken = bawarchiLogin.data?.token;

  const balajiLogin = await (
    await loginHandler(
      makeReq("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        body: { email: "balaji@nationx.local", password: "Password123!" },
      })
    )
  ).json();
  balajiToken = balajiLogin.data?.token;

  const c1Login = await (
    await loginHandler(
      makeReq("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        body: { email: "customer1@nationx.local", password: "Password123!" },
      })
    )
  ).json();
  customer1Token = c1Login.data?.token;

  const c2Login = await (
    await loginHandler(
      makeReq("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        body: { email: "customer2@nationx.local", password: "Password123!" },
      })
    )
  ).json();
  customer2Token = c2Login.data?.token;

  assert(Boolean(adminToken && bawarchiToken && balajiToken && customer1Token && customer2Token), "All test actors authenticated successfully");

  // =========================================================================
  // 1. MERCHANT DISCOVERY & CATALOGUE APIS
  // =========================================================================
  console.log("\n--- 1. Testing Merchant Discovery & Catalogue APIs ---");

  // GET /api/v1/merchants
  const merchantsRes = await getMerchantsHandler(makeReq("http://localhost:3000/api/v1/merchants"));
  const merchantsJson = await merchantsRes.json();
  assert(merchantsRes.status === 200, "GET /api/v1/merchants returns 200");
  assert(merchantsJson.data.merchants.length === 3, "Returns all 3 active Khammam merchants");
  const bawarchi = merchantsJson.data.merchants.find((m: any) => m.id === BAWARCHI_MERCHANT_ID);
  assert(bawarchi && bawarchi.name === "Bawarchi Biryani", "Found Bawarchi Biryani in merchant list");
  assert(bawarchi && bawarchi.productCount === 4, "Bawarchi accurately reports 4 active products");

  // Locality filter
  const localityRes = await getMerchantsHandler(
    makeReq("http://localhost:3000/api/v1/merchants?locality=Khammam%20Central")
  );
  const localityJson = await localityRes.json();
  assert(localityJson.data.merchants.length === 3, "Locality filter for Khammam Central returns 3 merchants");

  // Search filter
  const searchRes = await getMerchantsHandler(
    makeReq("http://localhost:3000/api/v1/merchants?search=Balaji")
  );
  const searchJson = await searchRes.json();
  assert(searchJson.data.merchants.length === 1 && searchJson.data.merchants[0].name.includes("Balaji"), "Search filter correctly isolates Balaji Kirana");

  // GET /api/v1/merchants/[id]
  const singleMerchRes = await getMerchantByIdHandler(
    makeReq(`http://localhost:3000/api/v1/merchants/${BAWARCHI_MERCHANT_ID}`),
    { params: Promise.resolve({ id: BAWARCHI_MERCHANT_ID }) }
  );
  const singleMerchJson = await singleMerchRes.json();
  assert(singleMerchRes.status === 200, "GET /api/v1/merchants/[id] returns 200");
  assert(singleMerchJson.data.merchant.code === "MERCH_BAWARCHI", "Returns merchant code MERCH_BAWARCHI");
  assert(singleMerchJson.data.merchant.locality === "Khammam Central", "Returns merchant locality");

  // =========================================================================
  // 2. PRODUCT CATALOGUE & SEARCH APIS
  // =========================================================================
  console.log("\n--- 2. Testing Product Catalogue & Search APIs ---");

  // GET /api/v1/merchants/[id]/products
  const productsRes = await getMerchantProductsHandler(
    makeReq(`http://localhost:3000/api/v1/merchants/${BAWARCHI_MERCHANT_ID}/products`),
    { params: Promise.resolve({ id: BAWARCHI_MERCHANT_ID }) }
  );
  const productsJson = await productsRes.json();
  assert(productsRes.status === 200, "GET /api/v1/merchants/[id]/products returns 200");
  assert(productsJson.data.products.length === 4, "Returns 4 products for Bawarchi Biryani");
  assert(Array.isArray(productsJson.data.categories) && productsJson.data.categories.length >= 2, "Returns distinct category list for quick filtering");

  // Category filter
  const catFilterRes = await getMerchantProductsHandler(
    makeReq(`http://localhost:3000/api/v1/merchants/${BAWARCHI_MERCHANT_ID}/products?category=Starters`),
    { params: Promise.resolve({ id: BAWARCHI_MERCHANT_ID }) }
  );
  const catFilterJson = await catFilterRes.json();
  assert(catFilterJson.data.products.length === 1 && catFilterJson.data.products[0].name.includes("Chicken 65"), "Category filter 'Starters' returns only Chicken 65");

  // Keyword search
  const prodSearchRes = await getMerchantProductsHandler(
    makeReq(`http://localhost:3000/api/v1/merchants/${BAWARCHI_MERCHANT_ID}/products?search=Mutton`),
    { params: Promise.resolve({ id: BAWARCHI_MERCHANT_ID }) }
  );
  const prodSearchJson = await prodSearchRes.json();
  assert(prodSearchJson.data.products.length === 1 && prodSearchJson.data.products[0].name.includes("Mutton Dum Biryani"), "Product keyword search for 'Mutton' matches correctly");

  // GET /api/v1/products/[id]
  const chickenBiryaniId = "50000000-0000-0000-0000-000000000001";
  const singleProdRes = await getProductByIdHandler(
    makeReq(`http://localhost:3000/api/v1/products/${chickenBiryaniId}`),
    { params: Promise.resolve({ id: chickenBiryaniId }) }
  );
  const singleProdJson = await singleProdRes.json();
  assert(singleProdRes.status === 200, "GET /api/v1/products/[id] returns 200");
  assert(singleProdJson.data.product.name === "Special Chicken Dum Biryani", "Returns exact product name");
  assert(singleProdJson.data.product.merchantName === "Bawarchi Biryani", "Enriches with merchant name");
  assert(singleProdJson.data.product.handlingTag === "HOT_FOOD", "Enforces handling tag HOT_FOOD");
  assert(Number(singleProdJson.data.product.price) === 320, "Returns price of 320 INR");

  // =========================================================================
  // 3. STOCK FRESHNESS & INACTIVE EXCLUSION RULES
  // =========================================================================
  console.log("\n--- 3. Testing Stock Freshness & Inactive Exclusion Rules ---");

  // Test Stale Stock (> 3 days old stock_confirmed_at): should automatically map to CALL_TO_CONFIRM
  const paneerBiryaniId = "50000000-0000-0000-0000-000000000003";
  await pool.query(
    `UPDATE public.products 
     SET stock_confirmed_at = timezone('utc'::text, now()) - INTERVAL '4 days' 
     WHERE id = $1`,
    [paneerBiryaniId]
  );

  const staleProdRes = await getProductByIdHandler(
    makeReq(`http://localhost:3000/api/v1/products/${paneerBiryaniId}`),
    { params: Promise.resolve({ id: paneerBiryaniId }) }
  );
  const staleProdJson = await staleProdRes.json();
  assert(staleProdJson.data.product.stockStatus === "CALL_TO_CONFIRM", "Stock confirmation > 3 days dynamically maps to 'CALL_TO_CONFIRM'");

  // Reset back to fresh
  await pool.query(
    `UPDATE public.products 
     SET stock_confirmed_at = timezone('utc'::text, now()) 
     WHERE id = $1`,
    [paneerBiryaniId]
  );

  // Test Inactive exclusion: Inactive product must not appear in merchant catalogue
  await pool.query(
    `UPDATE public.products SET is_active = false WHERE id = $1`,
    [paneerBiryaniId]
  );
  const inactiveCheckRes = await getMerchantProductsHandler(
    makeReq(`http://localhost:3000/api/v1/merchants/${BAWARCHI_MERCHANT_ID}/products`),
    { params: Promise.resolve({ id: BAWARCHI_MERCHANT_ID }) }
  );
  const inactiveCheckJson = await inactiveCheckRes.json();
  assert(inactiveCheckJson.data.products.length === 3, "Inactive products are excluded from merchant catalogue (count is 3)");
  const foundInactive = inactiveCheckJson.data.products.find((p: any) => p.id === paneerBiryaniId);
  assert(!foundInactive, "Deactivated product is not present in catalogue list");

  // Re-activate paneer biryani for subsequent tests
  await pool.query(
    `UPDATE public.products SET is_active = true WHERE id = $1`,
    [paneerBiryaniId]
  );

  // =========================================================================
  // 4. MERCHANT PRODUCT MANAGEMENT & ISOLATION
  // =========================================================================
  console.log("\n--- 4. Testing Merchant Product Management & Isolation ---");

  // Unauthenticated cannot add product
  const unauthAddRes = await createMerchantProductHandler(
    makeReq(`http://localhost:3000/api/v1/merchants/${BAWARCHI_MERCHANT_ID}/products`, {
      method: "POST",
      body: { name: "Illegal Item", category: "Test", price: 100 },
    }),
    { params: Promise.resolve({ id: BAWARCHI_MERCHANT_ID }) }
  );
  assert(unauthAddRes.status === 401, "Unauthenticated product creation returns 401");

  // Customer cannot add product
  const custAddRes = await createMerchantProductHandler(
    makeReq(`http://localhost:3000/api/v1/merchants/${BAWARCHI_MERCHANT_ID}/products`, {
      method: "POST",
      token: customer1Token,
      body: { name: "Customer Item", category: "Test", price: 100 },
    }),
    { params: Promise.resolve({ id: BAWARCHI_MERCHANT_ID }) }
  );
  assert(custAddRes.status === 403, "Customer token cannot create products (403 Forbidden)");

  // Merchant 2 (Balaji) cannot add product to Merchant 1 (Bawarchi)
  const crossMerchantAddRes = await createMerchantProductHandler(
    makeReq(`http://localhost:3000/api/v1/merchants/${BAWARCHI_MERCHANT_ID}/products`, {
      method: "POST",
      token: balajiToken,
      body: { name: "Balaji Invasive Item", category: "Test", price: 100 },
    }),
    { params: Promise.resolve({ id: BAWARCHI_MERCHANT_ID }) }
  );
  assert(crossMerchantAddRes.status === 403, "Merchant 2 cannot create products for Merchant 1 (403 Forbidden)");

  // Merchant 1 (Bawarchi) can add product to their own shop
  const validAddRes = await createMerchantProductHandler(
    makeReq(`http://localhost:3000/api/v1/merchants/${BAWARCHI_MERCHANT_ID}/products`, {
      method: "POST",
      token: bawarchiToken,
      body: {
        name: "Egg Dum Biryani",
        description: "Fragrant saffron basmati rice with spiced hard boiled eggs",
        category: "Biryani & Rice",
        price: 220.0,
        handlingTag: "HOT_FOOD",
        stockStatus: "IN_STOCK",
        isActive: true,
      },
    }),
    { params: Promise.resolve({ id: BAWARCHI_MERCHANT_ID }) }
  );
  const validAddJson = await validAddRes.json();
  assert(validAddRes.status === 201, "Merchant 1 successfully creates product for their own shop (201 Created)");
  assert(validAddJson.data.name === "Egg Dum Biryani", "Created product returns name");

  // =========================================================================
  // 5. AUTHORITATIVE PRICING & STOCK VALIDATION IN ORDER PLACEMENT
  // =========================================================================
  console.log("\n--- 5. Testing Authoritative Pricing & Stock Validation in Order Placement ---");

  // Attempt price tampering: Client passes unitPrice = 1.00 for Special Chicken Dum Biryani (catalog price: 320.00)
  const tamperOrderRes = await createOrderHandler(
    makeReq("http://localhost:3000/api/v1/orders", {
      method: "POST",
      token: customer1Token,
      body: {
        customerId: CUSTOMER_1_ID,
        fulfillmentMode: "SHARED_DELIVERY",
        deliveryAddress: "Flat 302, Sri Krishna Residency",
        deliveryLocality: "Khammam Central",
        suborders: [
          {
            merchantId: BAWARCHI_MERCHANT_ID,
            items: [
              {
                productId: chickenBiryaniId,
                productName: "Special Chicken Dum Biryani",
                quantity: 2,
                unitPrice: 1.0, // Forged low price!
              },
            ],
          },
        ],
      },
    })
  );
  const tamperOrderJson = await tamperOrderRes.json();
  assert(tamperOrderRes.status === 201, "Order creation succeeds with authoritative price overrides");
  assert(Number(tamperOrderJson.data.subtotal) === 640.0, "Server overrode forged price: 2 * 320.00 = 640.00 subtotal");
  assert(Number(tamperOrderJson.data.deliveryFee) === 40.0, "Authoritative delivery fee calculated (40.00 INR for 2.5km, 2 items)");
  assert(Number(tamperOrderJson.data.total) === 680.0, "Authoritative total calculated: 640 + 40 = 680.00 INR");

  // Attempt to order an OUT_OF_STOCK product
  const muttonBiryaniId = "50000000-0000-0000-0000-000000000002";
  await pool.query(`UPDATE public.products SET stock_status = 'OUT_OF_STOCK' WHERE id = $1`, [muttonBiryaniId]);

  const oosOrderRes = await createOrderHandler(
    makeReq("http://localhost:3000/api/v1/orders", {
      method: "POST",
      token: customer1Token,
      body: {
        customerId: CUSTOMER_1_ID,
        fulfillmentMode: "SHARED_DELIVERY",
        deliveryAddress: "Flat 302, Sri Krishna Residency",
        deliveryLocality: "Khammam Central",
        suborders: [
          {
            merchantId: BAWARCHI_MERCHANT_ID,
            items: [
              {
                productId: muttonBiryaniId,
                productName: "Mutton Dum Biryani (Double Masala)",
                quantity: 1,
                unitPrice: 420.0,
              },
            ],
          },
        ],
      },
    })
  );
  const oosOrderJson = await oosOrderRes.json();
  assert(oosOrderRes.status === 400, "Order containing OUT_OF_STOCK product is rejected with 400");
  assert(oosOrderJson.error.code === "PRODUCT_OUT_OF_STOCK", "Error code is PRODUCT_OUT_OF_STOCK");
  assert(oosOrderJson.error.message.includes("out of stock"), "Error message clarifies product is out of stock");

  // Reset mutton biryani to in stock
  await pool.query(`UPDATE public.products SET stock_status = 'IN_STOCK' WHERE id = $1`, [muttonBiryaniId]);

  // Attempt to order product from Merchant B under suborder for Merchant A
  const kajuKatliId = "50000000-0000-0000-0000-000000000009"; // belongs to Sri Krishna Sweets
  const mismatchOrderRes = await createOrderHandler(
    makeReq("http://localhost:3000/api/v1/orders", {
      method: "POST",
      token: customer1Token,
      body: {
        customerId: CUSTOMER_1_ID,
        fulfillmentMode: "SHARED_DELIVERY",
        deliveryAddress: "Flat 302, Sri Krishna Residency",
        deliveryLocality: "Khammam Central",
        suborders: [
          {
            merchantId: BAWARCHI_MERCHANT_ID, // Mismatch! Kaju Katli belongs to Sri Krishna Sweets
            items: [
              {
                productId: kajuKatliId,
                productName: "Premium Silver Leaf Kaju Katli",
                quantity: 1,
                unitPrice: 160.0,
              },
            ],
          },
        ],
      },
    })
  );
  const mismatchJson = await mismatchOrderRes.json();
  assert(mismatchOrderRes.status === 400, "Ordering a product under the wrong merchant is rejected with 400");
  assert(mismatchJson.error.message.includes("does not belong"), "Error message specifies merchant mismatch");

  // =========================================================================
  // 6. MULTI-SHOP CHECKOUT & SUBORDER GENERATION
  // =========================================================================
  console.log("\n--- 6. Testing Multi-Shop Checkout & Suborder Generation ---");

  const multiShopOrderRes = await createOrderHandler(
    makeReq("http://localhost:3000/api/v1/orders", {
      method: "POST",
      token: customer1Token,
      body: {
        customerId: CUSTOMER_1_ID,
        fulfillmentMode: "SHARED_DELIVERY",
        deliveryAddress: "Plot 99, Nehru Nagar, Khammam",
        deliveryLocality: "Khammam Central",
        idempotencyKey: "multi-shop-test-key-001",
        suborders: [
          {
            merchantId: BAWARCHI_MERCHANT_ID,
            items: [
              {
                productId: chickenBiryaniId,
                productName: "Special Chicken Dum Biryani",
                quantity: 1,
                unitPrice: 320.0,
              },
            ],
          },
          {
            merchantId: KRISHNA_MERCHANT_ID,
            items: [
              {
                productId: kajuKatliId,
                productName: "Premium Silver Leaf Kaju Katli (250g)",
                quantity: 2,
                unitPrice: 160.0,
              },
            ],
          },
        ],
      },
    })
  );
  const multiShopJson = await multiShopOrderRes.json();
  assert(multiShopOrderRes.status === 201, "Multi-shop order successfully created with 201");
  assert(multiShopJson.data.suborders.length === 2, "Creates exactly 2 separate merchant suborders");
  const bawarchiSub = multiShopJson.data.suborders.find((s: any) => s.merchantId === BAWARCHI_MERCHANT_ID);
  const krishnaSub = multiShopJson.data.suborders.find((s: any) => s.merchantId === KRISHNA_MERCHANT_ID);
  assert(bawarchiSub && Number(bawarchiSub.subtotal) === 320.0, "Bawarchi suborder has authoritative subtotal of 320.00");
  assert(krishnaSub && Number(krishnaSub.subtotal) === 320.0, "Krishna suborder has authoritative subtotal of 320.00 (2 * 160.00)");
  assert(Number(multiShopJson.data.subtotal) === 640.0, "Parent order combined subtotal is 640.00");

  // Test idempotency
  const dupOrderRes = await createOrderHandler(
    makeReq("http://localhost:3000/api/v1/orders", {
      method: "POST",
      token: customer1Token,
      body: {
        customerId: CUSTOMER_1_ID,
        fulfillmentMode: "SHARED_DELIVERY",
        deliveryAddress: "Plot 99, Nehru Nagar, Khammam",
        deliveryLocality: "Khammam Central",
        idempotencyKey: "multi-shop-test-key-001",
        suborders: [
          {
            merchantId: BAWARCHI_MERCHANT_ID,
            items: [{ productId: chickenBiryaniId, productName: "Biryani", quantity: 1, unitPrice: 320.0 }],
          },
        ],
      },
    })
  );
  const dupOrderJson = await dupOrderRes.json();
  assert(dupOrderRes.status === 200, "Idempotent re-submission returns 200");
  assert(dupOrderJson.data.id === multiShopJson.data.id, "Returns identical order ID without duplicating database rows");

  // =========================================================================
  // 7. IN-APP NOTIFICATIONS & AUTO-TRIGGER DISPATCH
  // =========================================================================
  console.log("\n--- 7. Testing In-App Notifications & Auto-Trigger Dispatch ---");

  // Fetch notifications for Customer 1:
  // The multi-shop order creation above inserted an event 'ORDER_REQUESTED',
  // which fired 'trg_delivery_events_notify' to create a notification for Customer 1.
  const c1NotifRes = await getNotificationsHandler(
    makeReq("http://localhost:3000/api/v1/notifications", { token: customer1Token })
  );
  const c1NotifJson = await c1NotifRes.json();
  assert(c1NotifRes.status === 200, "GET /api/v1/notifications returns 200 for authenticated user");
  assert(c1NotifJson.data.notifications.length >= 1, "Customer 1 has at least 1 notification from placed order");
  assert(c1NotifJson.data.unreadCount >= 1, "Unread count is correctly tracked");

  const latestNotif = c1NotifJson.data.notifications[0];
  assert(latestNotif.type === "ORDER_PLACED", "Trigger generated notification with type ORDER_PLACED");
  assert(latestNotif.deepLink.startsWith("/customer"), "Notification includes deep link to customer portal");

  // Notification Isolation: Customer 2 must NOT see Customer 1's notifications
  const c2NotifRes = await getNotificationsHandler(
    makeReq("http://localhost:3000/api/v1/notifications", { token: customer2Token })
  );
  const c2NotifJson = await c2NotifRes.json();
  const c2SawC1Notif = c2NotifJson.data.notifications.some((n: any) => n.id === latestNotif.id);
  assert(!c2SawC1Notif, "Customer-to-customer notification isolation verified: Customer 2 cannot see Customer 1 notification");

  // Mark single notification as read: PATCH /api/v1/notifications/[id]/read
  const readRes = await readNotificationHandler(
    makeReq(`http://localhost:3000/api/v1/notifications/${latestNotif.id}/read`, {
      method: "PATCH",
      token: customer1Token,
    }),
    { params: Promise.resolve({ id: latestNotif.id }) }
  );
  const readJson = await readRes.json();
  assert(readRes.status === 200, "PATCH /api/v1/notifications/[id]/read returns 200");
  assert(readJson.data.readAt !== null, "Notification readAt timestamp is recorded");

  // Mark all notifications as read: POST /api/v1/notifications/read-all
  const readAllRes = await readAllNotificationsHandler(
    makeReq("http://localhost:3000/api/v1/notifications/read-all", {
      method: "POST",
      token: customer1Token,
    })
  );
  const readAllJson = await readAllRes.json();
  assert(readAllRes.status === 200, "POST /api/v1/notifications/read-all returns 200");

  const c1NotifAfterAll = await (
    await getNotificationsHandler(
      makeReq("http://localhost:3000/api/v1/notifications", { token: customer1Token })
    )
  ).json();
  assert(c1NotifAfterAll.data.unreadCount === 0, "All notifications are marked read; unread count is 0");

  // =========================================================================
  // 8. CUSTOMER SAVED ADDRESSES
  // =========================================================================
  console.log("\n--- 8. Testing Customer Saved Addresses ---");

  // Fetch saved addresses for Customer 1
  const addrRes = await getAddressesHandler(
    makeReq("http://localhost:3000/api/v1/customer/addresses", { token: customer1Token })
  );
  const addrJson = await addrRes.json();
  assert(addrRes.status === 200, "GET /api/v1/customer/addresses returns 200");
  assert(addrJson.data.addresses.length >= 2, "Customer 1 retrieves seeded addresses (Home & Office)");
  assert(addrJson.data.addresses[0].isDefault === true, "Default address is listed first");

  // Address Isolation: Customer 2 only sees Customer 2 addresses
  const c2AddrRes = await getAddressesHandler(
    makeReq("http://localhost:3000/api/v1/customer/addresses", { token: customer2Token })
  );
  const c2AddrJson = await c2AddrRes.json();
  const c2SawC1Address = c2AddrJson.data.addresses.some((a: any) =>
    addrJson.data.addresses.some((c1a: any) => c1a.id === a.id)
  );
  assert(!c2SawC1Address, "Address isolation verified: Customer 2 cannot view Customer 1 saved addresses");

  // Customer 1 adds a new address: POST /api/v1/customer/addresses
  const newAddrRes = await createAddressHandler(
    makeReq("http://localhost:3000/api/v1/customer/addresses", {
      method: "POST",
      token: customer1Token,
      body: {
        label: "Gym / Sports Club",
        addressLine: "Station Road, Near Railway Ground",
        locality: "Khammam Central",
        landmark: "Next to Indoor Stadium",
        latitude: 17.251,
        longitude: 80.155,
        isDefault: false,
      },
    })
  );
  const newAddrJson = await newAddrRes.json();
  assert(newAddrRes.status === 201, "POST /api/v1/customer/addresses returns 201 Created");
  assert(newAddrJson.data.address.label === "Gym / Sports Club", "New address saved with correct label");

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n===================================================================");
  console.log(`   COMMERCE BACKEND TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runCommerceBackendTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
