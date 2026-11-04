-- NationX Shared Delivery — Deterministic Seed Data (Khammam Pilot)

-- Clear existing data
TRUNCATE public.delivery_fees, public.delivery_events, public.delivery_stops,
         public.delivery_assignments, public.batch_orders, public.delivery_batches,
         public.order_items, public.merchant_suborders, public.orders,
         public.delivery_partners, public.merchants, public.users, auth.users,
         public.partner_settlements, public.service_localities, public.service_zones CASCADE;

-- 1. Seed Auth Users
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@nationx.local'),
  ('b0000000-0000-0000-0000-000000000001', 'bawarchi@nationx.local'),
  ('b0000000-0000-0000-0000-000000000002', 'balaji@nationx.local'),
  ('b0000000-0000-0000-0000-000000000003', 'krishna@nationx.local'),
  ('c0000000-0000-0000-0000-000000000001', 'partner1@nationx.local'),
  ('c0000000-0000-0000-0000-000000000002', 'partner2@nationx.local'),
  ('d0000000-0000-0000-0000-000000000001', 'customer1@nationx.local'),
  ('d0000000-0000-0000-0000-000000000002', 'customer2@nationx.local'),
  ('d0000000-0000-0000-0000-000000000003', 'customer3@nationx.local');

-- 2. Seed Public Users
INSERT INTO public.users (id, name, email, phone, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Central Dispatch Ops', 'admin@nationx.local', '+919800000001', 'ADMIN'),
  ('b0000000-0000-0000-0000-000000000001', 'Bawarchi Biryani Manager', 'bawarchi@nationx.local', '+919800000002', 'MERCHANT'),
  ('b0000000-0000-0000-0000-000000000002', 'Balaji Kirana Owner', 'balaji@nationx.local', '+919800000003', 'MERCHANT'),
  ('b0000000-0000-0000-0000-000000000003', 'Sri Krishna Sweets Manager', 'krishna@nationx.local', '+919800000004', 'MERCHANT'),
  ('c0000000-0000-0000-0000-000000000001', 'Suresh Rider (2-Wheeler)', 'partner1@nationx.local', '+919800000005', 'PARTNER'),
  ('c0000000-0000-0000-0000-000000000002', 'Ramesh Rider (Offline)', 'partner2@nationx.local', '+919800000006', 'PARTNER'),
  ('d0000000-0000-0000-0000-000000000001', 'Rajesh K. (Customer 1)', 'customer1@nationx.local', '+919800000007', 'CUSTOMER'),
  ('d0000000-0000-0000-0000-000000000002', 'Priya M. (Customer 2)', 'customer2@nationx.local', '+919800000008', 'CUSTOMER'),
  ('d0000000-0000-0000-0000-000000000003', 'Venkat S. (Customer 3)', 'customer3@nationx.local', '+919800000009', 'CUSTOMER');

-- 3. Seed Merchants (3 shops in Khammam)
INSERT INTO public.merchants (id, user_id, name, code, address, locality, latitude, longitude) VALUES
  ('10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Bawarchi Biryani', 'MERCH_BAWARCHI', 'Wyra Road, Near RTC Bus Stand', 'Khammam Central', 17.2472, 80.1514),
  ('10000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Balaji Kirana & General Store', 'MERCH_BALAJI', 'Shop #4, Mayuri Centre', 'Khammam Central', 17.2490, 80.1530),
  ('10000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Sri Krishna Sweets & Bakery', 'MERCH_KRISHNA', 'Opp. Gandhi Park, Station Road', 'Khammam Central', 17.2510, 80.1545);

-- 4. Seed Delivery Partners
INSERT INTO public.delivery_partners (id, user_id, vehicle_type, capacity_units, availability, current_locality, latitude, longitude, verified) VALUES
  ('20000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Hero Splendor (Motorcycle)', 10, 'AVAILABLE', 'Khammam Central', 17.2480, 80.1520, true),
  ('20000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'Honda Activa (Scooter)', 8, 'OFFLINE', 'Mamillagudem', 17.2530, 80.1600, true);

-- 5. Seed Customer Orders (3 distinct customers in Khammam)
-- Order 1: Multi-shop order (Bawarchi + Krishna Sweets)
INSERT INTO public.orders (id, order_number, customer_id, status, fulfillment_mode, delivery_address, delivery_locality, delivery_latitude, delivery_longitude, subtotal, delivery_fee, total, pod_code) VALUES
  ('30000000-0000-0000-0000-000000000001', 'ORD-20261103-001', 'd0000000-0000-0000-0000-000000000001', 'CONFIRMED', 'SHARED_DELIVERY', 'Plot 42, Revenue Colony', 'Khammam Central', 17.2550, 17.2550, 480.00, 35.00, 515.00, '4829'),
  ('30000000-0000-0000-0000-000000000002', 'ORD-20261103-002', 'd0000000-0000-0000-0000-000000000002', 'CONFIRMED', 'SHARED_DELIVERY', 'H.No 3-2-11, Rotary Nagar', 'Khammam Central', 17.2580, 80.1580, 620.00, 30.00, 650.00, '7193'),
  ('30000000-0000-0000-0000-000000000003', 'ORD-20261103-003', 'd0000000-0000-0000-0000-000000000003', 'CONFIRMED', 'SHARED_DELIVERY', 'Flat 201, Bank Colony', 'Khammam Central', 17.2600, 80.1610, 320.00, 30.00, 350.00, '6381');

-- 6. Seed Delivery Fees
INSERT INTO public.delivery_fees (order_id, amount, currency, rule_code, is_demo_rule) VALUES
  ('30000000-0000-0000-0000-000000000001', 35.00, 'INR', 'DEMO_KHAMMAM_SHARED_V1', true),
  ('30000000-0000-0000-0000-000000000002', 30.00, 'INR', 'DEMO_KHAMMAM_SHARED_V1', true),
  ('30000000-0000-0000-0000-000000000003', 30.00, 'INR', 'DEMO_KHAMMAM_SHARED_V1', true);

-- 7. Seed Merchant Suborders
-- Order 1 has 2 suborders (Multi-shop!)
INSERT INTO public.merchant_suborders (id, suborder_number, order_id, merchant_id, status, subtotal) VALUES
  ('40000000-0000-0000-0000-000000000001', 'SUB-001-A', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'PLACED', 320.00),
  ('40000000-0000-0000-0000-000000000002', 'SUB-001-B', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'PLACED', 160.00),
-- Order 2 has 1 suborder (Balaji Kirana)
  ('40000000-0000-0000-0000-000000000003', 'SUB-002-A', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'PLACED', 620.00),
-- Order 3 has 1 suborder (Bawarchi Biryani)
  ('40000000-0000-0000-0000-000000000004', 'SUB-003-A', '30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'PLACED', 320.00);

-- 8. Seed Order Items
INSERT INTO public.order_items (suborder_id, product_name, sku, quantity, unit_price, handling_tag, weight_units) VALUES
  ('40000000-0000-0000-0000-000000000001', 'Special Chicken Dum Biryani', 'BW-BIRY-01', 1, 320.00, 'HOT_FOOD', 1.0),
  ('40000000-0000-0000-0000-000000000002', 'Gulab Jamun (Box of 4)', 'SK-SWEET-04', 1, 160.00, 'FRAGILE', 0.5),
  ('40000000-0000-0000-0000-000000000003', 'Freedom Sunflower Oil (1L Pouch)', 'BK-GROC-01', 2, 160.00, 'HEAVY', 2.0),
  ('40000000-0000-0000-0000-000000000003', 'Daawat Basmati Rice (1kg)', 'BK-GROC-02', 1, 300.00, 'DRY', 1.0),
  ('40000000-0000-0000-0000-000000000004', 'Special Paneer Biryani', 'BW-BIRY-02', 1, 320.00, 'HOT_FOOD', 1.0);

-- 9. Initial Order Events
INSERT INTO public.delivery_events (type, message, actor_id, order_id) VALUES
  ('ORDER_REQUESTED', 'Customer placed order ORD-20261103-001', 'd0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('ORDER_REQUESTED', 'Customer placed order ORD-20261103-002', 'd0000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002'),
  ('ORDER_REQUESTED', 'Customer placed order ORD-20261103-003', 'd0000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003');

-- 10. Seed Demonstration Products for Khammam Merchants
INSERT INTO public.products (
  id, merchant_id, name, description, category, price, image_url, handling_tag, stock_status, stock_confirmed_at, is_active
) VALUES
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Special Chicken Dum Biryani', 'Authentic Hyderabadi basmati rice slow-cooked with spiced chicken pieces, served with mirchi ka salan and dahi raita.', 'Biryani & Rice', 320.00, '/images/products/chicken-biryani.jpg', 'HOT_FOOD', 'IN_STOCK', timezone('utc'::text, now()), true),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Mutton Dum Biryani (Double Masala)', 'Tender mutton chunks marinated in fragrant spices layered with aged basmati rice.', 'Biryani & Rice', 420.00, '/images/products/mutton-biryani.jpg', 'HOT_FOOD', 'IN_STOCK', timezone('utc'::text, now()), true),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Paneer Tikka Biryani', 'Grilled cottage cheese cubes spiced with tandoori masala and baked with saffron rice.', 'Biryani & Rice', 260.00, '/images/products/paneer-biryani.jpg', 'HOT_FOOD', 'IN_STOCK', timezone('utc'::text, now()), true),
  ('50000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Chicken 65 (Crispy Appetizer)', 'Deep-fried boneless chicken bites tossed with curry leaves, green chilies, and yogurt garlic sauce.', 'Starters', 240.00, '/images/products/chicken-65.jpg', 'HOT_FOOD', 'IN_STOCK', timezone('utc'::text, now()), true),
  ('50000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Aashirvaad Shudh Chakki Atta (5 kg)', '100% whole wheat flour, fiber rich, stone-ground for soft rotis.', 'Groceries & Staples', 280.00, '/images/products/atta-5kg.jpg', 'STANDARD', 'IN_STOCK', timezone('utc'::text, now()), true),
  ('50000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'Sona Masoori Raw Rice (10 kg Bag)', 'Lightweight, aromatic medium-grain rice cultivated in Telangana/Andhra delta.', 'Groceries & Staples', 620.00, '/images/products/rice-10kg.jpg', 'STANDARD', 'IN_STOCK', timezone('utc'::text, now()), true),
  ('50000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', 'Freedom Refined Sunflower Oil (1 Litre Pouch)', 'Fortified with Vitamins A & D, ideal for daily household cooking.', 'Oils & Ghee', 145.00, '/images/products/sunflower-oil.jpg', 'STANDARD', 'IN_STOCK', timezone('utc'::text, now()), true),
  ('50000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', 'Farm Fresh Toor Dal / Kandipappu (1 kg)', 'Unpolished indigenous yellow pigeon peas for traditional sambar and dal.', 'Dals & Pulses', 160.00, '/images/products/toor-dal.jpg', 'STANDARD', 'IN_STOCK', timezone('utc'::text, now()), true),
  ('50000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003', 'Premium Silver Leaf Kaju Katli (250g)', 'Melt-in-mouth diamond cuts made with premium Goan cashews and pure desi ghee.', 'Traditional Sweets', 160.00, '/images/products/kaju-katli.jpg', 'PERISHABLE', 'IN_STOCK', timezone('utc'::text, now()), true),
  ('50000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000003', 'Pure Ghee Motichoor Laddu (250g Box)', 'Fine besan pearls fried in pure ghee, flavored with saffron and cardamom.', 'Traditional Sweets', 110.00, '/images/products/motichoor-laddu.jpg', 'PERISHABLE', 'IN_STOCK', timezone('utc'::text, now()), true),
  ('50000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000003', 'Special Soft Gulab Jamun (6 Pieces)', 'Traditional khoya dumplings soaked in fragrant rose and green cardamom syrup.', 'Traditional Sweets', 120.00, '/images/products/gulab-jamun.jpg', 'FRAGILE', 'IN_STOCK', timezone('utc'::text, now()), true),
  ('50000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000003', 'Bakery Fresh Butter Cookies (200g Pack)', 'Crisp crumbly butter biscuits baked fresh daily at the Station Road bakery.', 'Bakery & Snacks', 95.00, '/images/products/butter-cookies.jpg', 'FRAGILE', 'IN_STOCK', timezone('utc'::text, now()), true)
ON CONFLICT (id) DO UPDATE SET
  price = EXCLUDED.price,
  stock_status = EXCLUDED.stock_status,
  updated_at = timezone('utc'::text, now());

-- 11. Seed Customer Saved Delivery Addresses
INSERT INTO public.customer_addresses (
  id, user_id, label, address_line, locality, landmark, latitude, longitude, is_default
) VALUES
  ('60000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Home', 'Flat 302, Sri Krishna Residency, Wyra Road', 'Khammam Central', 'Near RTC Bus Stand', 17.2475, 80.1518, true),
  ('60000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Office', 'Cabin 12, Co-working Hub, Trunk Road', 'Khammam Central', 'Opposite Head Post Office', 17.2485, 80.1525, false),
  ('60000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000002', 'Home', 'House #12-4-51, Mamata Hospital Road', 'Mamillagudem', 'Near Mamata Medical College Gate', 17.2530, 80.1560, true)
ON CONFLICT (id) DO UPDATE SET
  address_line = EXCLUDED.address_line,
  updated_at = timezone('utc'::text, now());

-- 12. Seed Initial Notifications
INSERT INTO public.notifications (
  id, user_id, type, title, message, deep_link, order_id, created_at
) VALUES
  ('70000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'ORDER_PLACED', 'Welcome to NationX Khammam', 'You can now browse local shops and combine items from Bawarchi Biryani, Balaji Kirana, and Sri Krishna Sweets in one shared delivery batch.', '/customer', '30000000-0000-0000-0000-000000000001', timezone('utc'::text, now()) - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- 13. Seed Configurable Service Zones (Multi-City Scalability)
INSERT INTO public.service_zones (
  id, code, name, city, state, center_latitude, center_longitude, radius_km,
  operating_hours_start, operating_hours_end, is_active, max_batch_orders, max_batch_capacity,
  base_delivery_fee, per_km_fee, min_order_subtotal
) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'ZONE_KHAMMAM_CENTRAL', 'Khammam Central Pilot Hub', 'Khammam', 'Telangana', 17.2485, 80.1530, 12.0, '06:00:00', '23:00:00', true, 4, 10, 35.00, 10.00, 50.00),
  ('e0000000-0000-0000-0000-000000000002', 'ZONE_WARANGAL_URBAN', 'Warangal Urban Expansion Zone', 'Warangal', 'Telangana', 17.9689, 79.5941, 15.0, '07:00:00', '22:00:00', true, 5, 12, 40.00, 12.00, 100.00),
  ('e0000000-0000-0000-0000-000000000003', 'ZONE_SURYAPET_TOWN', 'Suryapet Regional Hub', 'Suryapet', 'Telangana', 17.1439, 79.6239, 10.0, '07:00:00', '21:30:00', true, 3, 8, 30.00, 8.00, 50.00)
ON CONFLICT (code) DO NOTHING;

-- 14. Seed Service Localities
INSERT INTO public.service_localities (
  zone_id, name, code, latitude, longitude, is_active
) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Khammam Central', 'LOC_KHAMMAM_CENTRAL', 17.2485, 80.1530, true),
  ('e0000000-0000-0000-0000-000000000001', 'Wyra Road', 'LOC_WYRA_ROAD', 17.2475, 80.1518, true),
  ('e0000000-0000-0000-0000-000000000001', 'Mayuri Centre', 'LOC_MAYURI_CENTRE', 17.2450, 80.1480, true),
  ('e0000000-0000-0000-0000-000000000001', 'Station Road', 'LOC_STATION_ROAD', 17.2510, 80.1575, true),
  ('e0000000-0000-0000-0000-000000000001', 'Mamillagudem', 'LOC_MAMILLAGUDEM', 17.2600, 80.1600, true),
  ('e0000000-0000-0000-0000-000000000002', 'Hanamkonda Main', 'LOC_HANAMKONDA', 17.9950, 79.5600, true),
  ('e0000000-0000-0000-0000-000000000002', 'Kazipet Junction', 'LOC_KAZIPET', 17.9750, 79.5200, true),
  ('e0000000-0000-0000-0000-000000000003', 'Suryapet Bus Stand', 'LOC_SURYAPET_BUS_STAND', 17.1420, 79.6200, true)
ON CONFLICT (code) DO NOTHING;
