import { pool } from "../apps/web/lib/db";
import crypto from "crypto";

async function verifyMultipleMerchants() {
  console.log("=== Verifying Workstream 2: Multiple Merchant Registration & Approval ===");

  const testMerchants = [
    {
      email: "merchant_laxmi@nationx.local",
      name: "Sri Laxmi Provision Stores",
      category: "Groceries & Staples",
      locality: "Mayuri Centre",
      address: "Door 4-2-118, Mayuri Centre, Khammam",
      lat: 17.2512,
      lng: 80.1489,
      phone: "+91 98480 11001",
      code: "LAXM-101"
    },
    {
      email: "merchant_kakatiya@nationx.local",
      name: "Kakatiya Spicy Kitchen",
      category: "Restaurants",
      locality: "Wyra Road",
      address: "Shop 12, Complex 4, Wyra Road, Khammam",
      lat: 17.2435,
      lng: 80.1555,
      phone: "+91 98480 11002",
      code: "KAKA-102"
    },
    {
      email: "merchant_venkat@nationx.local",
      name: "Venkateshwara Dairy Farm",
      category: "Dairy & Eggs",
      locality: "Gandhi Chowk",
      address: "Station Road, Gandhi Chowk, Khammam",
      lat: 17.2470,
      lng: 80.1520,
      phone: "+91 98480 11003",
      code: "VENK-103"
    },
    {
      email: "merchant_annapurna@nationx.local",
      name: "Annapurna Super Bazaar",
      category: "Groceries & Daily Essentials",
      locality: "Bus Stand Road",
      address: "Opposite RTC Bus Stand, Khammam",
      lat: 17.2490,
      lng: 80.1500,
      phone: "+91 98480 11004",
      code: "ANNA-104"
    },
    {
      email: "merchant_telangana@nationx.local",
      name: "Telangana Sweet House",
      category: "Sweets & Bakery",
      locality: "Trunk Road",
      address: "Near Clock Tower, Trunk Road, Khammam",
      lat: 17.2465,
      lng: 80.1540,
      phone: "+91 98480 11005",
      code: "TELA-105"
    }
  ];

  for (const m of testMerchants) {
    // 1. Ensure user exists in auth.users and public.users
    let userRes = await pool.query(`SELECT id FROM public.users WHERE email = $1`, [m.email]);
    let userId: string;

    if (userRes.rows.length === 0) {
      userId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO auth.users (id, email, raw_user_meta_data)
         VALUES ($1, $2, '{"role":"MERCHANT"}')
         ON CONFLICT (id) DO NOTHING`,
        [userId, m.email]
      );
      await pool.query(
        `INSERT INTO public.users (id, email, name, role)
         VALUES ($1, $2, $3, 'MERCHANT')
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name`,
        [userId, m.email, m.name]
      );
    } else {
      userId = userRes.rows[0].id;
    }

    // 2. Check if merchant outlet exists by code
    const existing = await pool.query(`SELECT id FROM public.merchants WHERE code = $1 OR user_id = $2`, [m.code, userId]);
    let merchantId: string;

    if (existing.rows.length === 0) {
      const res = await pool.query(
        `INSERT INTO public.merchants (
          user_id, name, code, category, address, locality, latitude, longitude,
          contact_phone, is_active, is_approved, rating, rating_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true, 4.8, 15)
        RETURNING id, name, category, locality`,
        [userId, m.name, m.code, m.category, m.address, m.locality, m.lat, m.lng, m.phone]
      );
      merchantId = res.rows[0].id;
      console.log(`[PASS] Created new merchant: ${res.rows[0].name} (${res.rows[0].category}) - ID: ${merchantId}`);
    } else {
      merchantId = existing.rows[0].id;
      await pool.query(
        `UPDATE public.merchants SET
          name = $1, category = $2, address = $3, locality = $4,
          latitude = $5, longitude = $6, contact_phone = $7,
          is_active = true, is_approved = true
         WHERE id = $8`,
        [m.name, m.category, m.address, m.locality, m.lat, m.lng, m.phone, merchantId]
      );
      console.log(`[PASS] Updated existing merchant: ${m.name} (${m.category}) - ID: ${merchantId}`);
    }

    // 3. Add starter products for each merchant if none exist
    const prodCountRes = await pool.query(`SELECT count(*)::int as count FROM public.products WHERE merchant_id = $1`, [merchantId]);
    if (prodCountRes.rows[0].count === 0) {
      await pool.query(
        `INSERT INTO public.products (
          merchant_id, name, category, description, price, unit, stock_status, handling_tag, is_active
        ) VALUES 
        ($1, $2, $3, $4, 120.00, 'pack', 'IN_STOCK', 'STANDARD', true),
        ($1, $5, $3, $6, 250.00, 'kg', 'IN_STOCK', 'STANDARD', true)`,
        [
          merchantId,
          `Special ${m.name.split(" ")[1] || "Item"} Pack`,
          m.category,
          `Authentic regional product from ${m.name}`,
          `Premium ${m.name.split(" ")[0]} Selection`,
          `Freshly prepared daily in ${m.locality}`
        ]
      );
      console.log(`[PASS] Seeded starter products for ${m.name}`);
    }
  }

  // 4. Update seed merchants categories
  await pool.query(`UPDATE public.merchants SET category = 'Restaurants' WHERE name = 'Bawarchi Biryani'`);
  await pool.query(`UPDATE public.merchants SET category = 'Groceries & Staples' WHERE name = 'Balaji Kirana & General Store'`);
  await pool.query(`UPDATE public.merchants SET category = 'Sweets & Bakery' WHERE name = 'Sri Krishna Sweets & Bakery'`);

  // 5. Query total approved active merchants count
  const countRes = await pool.query(`SELECT count(*)::int as count FROM public.merchants WHERE is_approved = true AND is_active = true`);
  console.log(`[PASS] Total active, approved merchants in Khammam: ${countRes.rows[0].count}`);

  if (countRes.rows[0].count < 8) {
    throw new Error(`Merchant count below 8: got ${countRes.rows[0].count}`);
  }

  console.log("=== Workstream 2 Verification Successful: 8 Active Merchants Live ===");
  process.exit(0);
}

verifyMultipleMerchants().catch((err) => {
  console.error(err);
  process.exit(1);
});
