-- ============================================================================
-- NATIONX SHARED DELIVERY & LOGISTICS — PHASE 5.3A
-- Migration: Commerce Catalogue, Notifications & Saved Addresses
-- ============================================================================

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
  description TEXT,
  category TEXT NOT NULL CHECK (char_length(trim(category)) >= 2),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  handling_tag TEXT NOT NULL DEFAULT 'STANDARD' CHECK (handling_tag IN ('STANDARD', 'FRAGILE', 'PERISHABLE', 'HOT_FOOD', 'COLD_FOOD')),
  stock_status TEXT NOT NULL DEFAULT 'IN_STOCK' CHECK (stock_status IN ('IN_STOCK', 'CALL_TO_CONFIRM', 'OUT_OF_STOCK')),
  stock_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for Products
CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON public.products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_search ON public.products USING gin (name gin_trgm_ops, category gin_trgm_ops);

-- RLS for Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select_policy ON public.products
  FOR SELECT
  USING (
    is_active = true 
    OR public.is_admin() 
    OR merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  );

CREATE POLICY products_insert_policy ON public.products
  FOR INSERT
  WITH CHECK (
    public.is_admin() 
    OR merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  );

CREATE POLICY products_update_policy ON public.products
  FOR UPDATE
  USING (
    public.is_admin() 
    OR merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  );

CREATE POLICY products_delete_policy ON public.products
  FOR DELETE
  USING (
    public.is_admin() 
    OR merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  );

-- 2. Create Saved Customer Addresses Table
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  address_line TEXT NOT NULL CHECK (char_length(trim(address_line)) >= 5),
  locality TEXT NOT NULL CHECK (char_length(trim(locality)) >= 2),
  landmark TEXT,
  latitude DOUBLE PRECISION CHECK (latitude IS NULL OR (latitude BETWEEN -90.0 AND 90.0)),
  longitude DOUBLE PRECISION CHECK (longitude IS NULL OR (longitude BETWEEN -180.0 AND 180.0)),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.customer_addresses(user_id);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY addresses_user_isolation ON public.customer_addresses
  FOR ALL
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 3. Create Persistent In-App Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'ORDER_PLACED', 'ORDER_ACCEPTED', 'ORDER_PREPARING', 
    'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 
    'DELIVERED', 'DELIVERY_FAILED', 'ASSIGNMENT_OFFERED', 
    'BATCH_DISPATCHED', 'SYSTEM_ALERT'
  )),
  title TEXT NOT NULL CHECK (char_length(trim(title)) >= 2),
  message TEXT NOT NULL CHECK (char_length(trim(message)) >= 2),
  deep_link TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  suborder_id UUID REFERENCES public.merchant_suborders(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.delivery_batches(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_policy ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY notifications_update_policy ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT
  WITH CHECK (public.is_admin() OR auth.uid() IS NOT NULL);

-- 4. Notification Creation Helper Function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.fn_create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_deep_link TEXT DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_suborder_id UUID DEFAULT NULL,
  p_batch_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Prevent exact duplicate notification within last 60 seconds
  SELECT id INTO v_notification_id
  FROM public.notifications
  WHERE user_id = p_user_id
    AND type = p_type
    AND COALESCE(order_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(p_order_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND created_at > (timezone('utc'::text, now()) - INTERVAL '60 seconds')
  LIMIT 1;

  IF v_notification_id IS NOT NULL THEN
    RETURN v_notification_id;
  END IF;

  INSERT INTO public.notifications (
    user_id, type, title, message, deep_link, order_id, suborder_id, batch_id
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_deep_link, p_order_id, p_suborder_id, p_batch_id
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID) TO authenticated, service_role;

-- 5. Trigger Function to Automatically Convert Delivery Events into Notifications
CREATE OR REPLACE FUNCTION public.trg_delivery_events_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id UUID;
  v_merchant_user_id UUID;
  v_partner_user_id UUID;
  v_order_number TEXT;
  v_suborder_number TEXT;
BEGIN
  -- 1. Fetch Order Details if order_id is present
  IF NEW.order_id IS NOT NULL THEN
    SELECT customer_id, order_number INTO v_customer_id, v_order_number
    FROM public.orders WHERE id = NEW.order_id;
  END IF;

  -- 2. Fetch Merchant User ID if suborder_id is present
  IF NEW.suborder_id IS NOT NULL THEN
    SELECT m.user_id, ms.suborder_number INTO v_merchant_user_id, v_suborder_number
    FROM public.merchant_suborders ms
    JOIN public.merchants m ON ms.merchant_id = m.id
    WHERE ms.id = NEW.suborder_id;
  END IF;

  -- 3. Fetch Partner User ID if batch_id is present
  IF NEW.batch_id IS NOT NULL THEN
    SELECT dp.user_id INTO v_partner_user_id
    FROM public.delivery_assignments da
    JOIN public.delivery_partners dp ON da.partner_id = dp.id
    WHERE da.batch_id = NEW.batch_id AND da.status IN ('OFFERED', 'ACCEPTED')
    ORDER BY da.created_at DESC LIMIT 1;
  END IF;

  -- 4. Dispatch Notifications based on event type
  CASE NEW.type
    WHEN 'ORDER_REQUESTED' THEN
      IF v_customer_id IS NOT NULL THEN
        PERFORM public.fn_create_notification(
          v_customer_id,
          'ORDER_PLACED',
          'Order Confirmed',
          'Your multi-shop order #' || v_order_number || ' has been placed.',
          '/customer?order=' || NEW.order_id,
          NEW.order_id,
          NEW.suborder_id,
          NULL
        );
      END IF;
      IF v_merchant_user_id IS NOT NULL THEN
        PERFORM public.fn_create_notification(
          v_merchant_user_id,
          'ORDER_PLACED',
          'New Incoming Suborder',
          'Suborder #' || v_suborder_number || ' received. Please accept and prepare.',
          '/merchant',
          NEW.order_id,
          NEW.suborder_id,
          NULL
        );
      END IF;

    WHEN 'MERCHANT_ACCEPTED' THEN
      IF v_customer_id IS NOT NULL THEN
        PERFORM public.fn_create_notification(
          v_customer_id,
          'ORDER_ACCEPTED',
          'Merchant Accepted Order',
          'Merchant has accepted suborder #' || COALESCE(v_suborder_number, '') || ' and begun preparation.',
          '/customer?order=' || NEW.order_id,
          NEW.order_id,
          NEW.suborder_id,
          NULL
        );
      END IF;

    WHEN 'READY_FOR_PICKUP' THEN
      IF v_customer_id IS NOT NULL THEN
        PERFORM public.fn_create_notification(
          v_customer_id,
          'READY_FOR_PICKUP',
          'Order Ready for Pickup',
          'Suborder #' || COALESCE(v_suborder_number, '') || ' is packed and awaiting rider handover.',
          '/customer?order=' || NEW.order_id,
          NEW.order_id,
          NEW.suborder_id,
          NULL
        );
      END IF;
      IF v_partner_user_id IS NOT NULL THEN
        PERFORM public.fn_create_notification(
          v_partner_user_id,
          'READY_FOR_PICKUP',
          'Stop Ready for Handover',
          'Merchant has marked items ready for pickup.',
          '/partner',
          NEW.order_id,
          NEW.suborder_id,
          NEW.batch_id
        );
      END IF;

    WHEN 'PICKUP_CONFIRMED' THEN
      IF v_customer_id IS NOT NULL THEN
        PERFORM public.fn_create_notification(
          v_customer_id,
          'PICKED_UP',
          'Items Collected by Partner',
          'Your suborder #' || COALESCE(v_suborder_number, '') || ' was picked up and is in transit.',
          '/customer?order=' || NEW.order_id,
          NEW.order_id,
          NEW.suborder_id,
          NULL
        );
      END IF;

    WHEN 'PARTNER_ASSIGNED' THEN
      IF v_partner_user_id IS NOT NULL THEN
        PERFORM public.fn_create_notification(
          v_partner_user_id,
          'ASSIGNMENT_OFFERED',
          'New Delivery Batch Offered',
          'A shared delivery batch in Khammam has been offered to you. Please respond.',
          '/partner',
          NEW.order_id,
          NEW.suborder_id,
          NEW.batch_id
        );
      END IF;

    WHEN 'DELIVERED' THEN
      IF v_customer_id IS NOT NULL THEN
        PERFORM public.fn_create_notification(
          v_customer_id,
          'DELIVERED',
          'Order Delivered Successfully',
          'Your delivery #' || COALESCE(v_order_number, '') || ' has been completed. Proof of delivery verified.',
          '/customer?order=' || NEW.order_id,
          NEW.order_id,
          NEW.suborder_id,
          NEW.batch_id
        );
      END IF;

    WHEN 'DELIVERY_ATTEMPTED' THEN
      IF v_customer_id IS NOT NULL THEN
        PERFORM public.fn_create_notification(
          v_customer_id,
          'DELIVERY_FAILED',
          'Delivery Attempt Recorded',
          'Delivery partner attempted drop-off for order #' || COALESCE(v_order_number, '') || '.',
          '/customer?order=' || NEW.order_id,
          NEW.order_id,
          NEW.suborder_id,
          NEW.batch_id
        );
      END IF;

    ELSE
      -- No direct customer alert required for internal audit events
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_delivery_event ON public.delivery_events;
CREATE TRIGGER trg_notify_on_delivery_event
  AFTER INSERT ON public.delivery_events
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_delivery_events_notify();

-- Grant permissions on new tables to standard roles
GRANT ALL ON public.products TO authenticated, service_role;
GRANT ALL ON public.customer_addresses TO authenticated, service_role;
GRANT ALL ON public.notifications TO authenticated, service_role;
GRANT SELECT ON public.products TO anon;

-- ============================================================================
-- 6. Deterministic Khammam Demonstration Seed Data
-- ============================================================================

-- A. Seed Demonstration Products
INSERT INTO public.products (
  id, merchant_id, name, description, category, price, image_url, handling_tag, stock_status, stock_confirmed_at, is_active
) VALUES
  -- Bawarchi Biryani Products (Wyra Road)
  (
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Special Chicken Dum Biryani',
    'Authentic Hyderabadi basmati rice slow-cooked with spiced chicken pieces, served with mirchi ka salan and dahi raita.',
    'Biryani & Rice',
    320.00,
    '/images/products/chicken-biryani.jpg',
    'HOT_FOOD',
    'IN_STOCK',
    timezone('utc'::text, now()),
    true
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Mutton Dum Biryani (Double Masala)',
    'Tender mutton chunks marinated in fragrant spices layered with aged basmati rice.',
    'Biryani & Rice',
    420.00,
    '/images/products/mutton-biryani.jpg',
    'HOT_FOOD',
    'IN_STOCK',
    timezone('utc'::text, now()),
    true
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'Paneer Tikka Biryani',
    'Grilled cottage cheese cubes spiced with tandoori masala and baked with saffron rice.',
    'Biryani & Rice',
    260.00,
    '/images/products/paneer-biryani.jpg',
    'HOT_FOOD',
    'IN_STOCK',
    timezone('utc'::text, now()),
    true
  ),
  (
    '50000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    'Chicken 65 (Crispy Appetizer)',
    'Deep-fried boneless chicken bites tossed with curry leaves, green chilies, and yogurt garlic sauce.',
    'Starters',
    240.00,
    '/images/products/chicken-65.jpg',
    'HOT_FOOD',
    'IN_STOCK',
    timezone('utc'::text, now()),
    true
  ),

  -- Balaji Kirana & General Store (Mayuri Centre)
  (
    '50000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000002',
    'Aashirvaad Shudh Chakki Atta (5 kg)',
    '100% whole wheat flour, fiber rich, stone-ground for soft rotis.',
    'Groceries & Staples',
    280.00,
    '/images/products/atta-5kg.jpg',
    'STANDARD',
    'IN_STOCK',
    timezone('utc'::text, now()),
    true
  ),
  (
    '50000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000002',
    'Sona Masoori Raw Rice (10 kg Bag)',
    'Lightweight, aromatic medium-grain rice cultivated in Telangana/Andhra delta.',
    'Groceries & Staples',
    620.00,
    '/images/products/rice-10kg.jpg',
    'STANDARD',
    'IN_STOCK',
    timezone('utc'::text, now()),
    true
  ),
  (
    '50000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000002',
    'Freedom Refined Sunflower Oil (1 Litre Pouch)',
    'Fortified with Vitamins A & D, ideal for daily household cooking.',
    'Oils & Ghee',
    145.00,
    '/images/products/sunflower-oil.jpg',
    'STANDARD',
    'IN_STOCK',
    timezone('utc'::text, now()),
    true
  ),
  (
    '50000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000002',
    'Farm Fresh Toor Dal / Kandipappu (1 kg)',
    'Unpolished indigenous yellow pigeon peas for traditional sambar and dal.',
    'Dals & Pulses',
    160.00,
    '/images/products/toor-dal.jpg',
    'STANDARD',
    'IN_STOCK',
    timezone('utc'::text, now()),
    true
  ),

  -- Sri Krishna Sweets & Bakery (Station Road)
  (
    '50000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000003',
    'Premium Silver Leaf Kaju Katli (250g)',
    'Melt-in-mouth diamond cuts made with premium Goan cashews and pure desi ghee.',
    'Traditional Sweets',
    160.00,
    '/images/products/kaju-katli.jpg',
    'PERISHABLE',
    'IN_STOCK',
    timezone('utc'::text, now()),
    true
  ),
  (
    '50000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000003',
    'Pure Ghee Motichoor Laddu (250g Box)',
    'Fine besan pearls fried in pure ghee, flavored with saffron and cardamom.',
    'Traditional Sweets',
    110.00,
    '/images/products/motichoor-laddu.jpg',
    'PERISHABLE',
    'IN_STOCK',
    timezone('utc'::text, now()),
    true
  ),
  (
    '50000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000003',
    'Special Soft Gulab Jamun (6 Pieces)',
    'Traditional khoya dumplings soaked in fragrant rose and green cardamom syrup.',
    'Traditional Sweets',
    120.00,
    '/images/products/gulab-jamun.jpg',
    'FRAGILE',
    'IN_STOCK',
    timezone('utc'::text, now()),
    true
  ),
  (
    '50000000-0000-0000-0000-000000000012',
    '10000000-0000-0000-0000-000000000003',
    'Bakery Fresh Butter Cookies (200g Pack)',
    'Crisp crumbly butter biscuits baked fresh daily at the Station Road bakery.',
    'Bakery & Snacks',
    95.00,
    '/images/products/butter-cookies.jpg',
    'FRAGILE',
    'IN_STOCK',
    timezone('utc'::text, now()),
    true
  )
ON CONFLICT (id) DO UPDATE SET
  price = EXCLUDED.price,
  stock_status = EXCLUDED.stock_status,
  updated_at = timezone('utc'::text, now());

-- B. Seed Customer Saved Delivery Addresses
INSERT INTO public.customer_addresses (
  id, user_id, label, address_line, locality, landmark, latitude, longitude, is_default
) VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'Home',
    'Flat 302, Sri Krishna Residency, Wyra Road',
    'Khammam Central',
    'Near RTC Bus Stand',
    17.2475,
    80.1518,
    true
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    'Office',
    'Cabin 12, Co-working Hub, Trunk Road',
    'Khammam Central',
    'Opposite Head Post Office',
    17.2485,
    80.1525,
    false
  ),
  (
    '60000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000002',
    'Home',
    'House #12-4-51, Mamata Hospital Road',
    'Mamillagudem',
    'Near Mamata Medical College Gate',
    17.2530,
    80.1560,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  address_line = EXCLUDED.address_line,
  updated_at = timezone('utc'::text, now());

-- C. Seed Initial System Notification for Customer 1
INSERT INTO public.notifications (
  id, user_id, type, title, message, deep_link, order_id, created_at
) VALUES
  (
    '70000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'ORDER_PLACED',
    'Welcome to NationX Khammam',
    'You can now browse local shops and combine items from Bawarchi Biryani, Balaji Kirana, and Sri Krishna Sweets in one shared delivery batch.',
    '/customer',
    '30000000-0000-0000-0000-000000000001',
    timezone('utc'::text, now()) - INTERVAL '2 hours'
  )
ON CONFLICT (id) DO NOTHING;
