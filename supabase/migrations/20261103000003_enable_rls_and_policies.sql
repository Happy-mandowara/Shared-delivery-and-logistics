-- NationX Shared Delivery — Migration 03: Row Level Security (RLS) & Policies

-- Ensure standard Supabase roles exist for local/CI test environments
DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Grant schema and table usage to standard Supabase roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Ensure auth.uid() helper function exists for standalone/pgTAP test environments
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Security helper functions
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Helper functions to avoid RLS circular recursion
CREATE OR REPLACE FUNCTION public.fn_is_order_merchant(p_order_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.merchant_suborders ms
    JOIN public.merchants m ON ms.merchant_id = m.id
    WHERE ms.order_id = p_order_id AND m.user_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.fn_is_order_customer(p_order_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id AND o.customer_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Enable Row Level Security on EVERY table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_suborders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_fees ENABLE ROW LEVEL SECURITY;

-- 1. USERS POLICIES
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.users;
CREATE POLICY "Users can view own profile or admins view all"
ON public.users FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users"
ON public.users FOR ALL
TO authenticated
USING (public.is_admin());

-- 2. MERCHANTS POLICIES
DROP POLICY IF EXISTS "Active merchants are viewable by authenticated users" ON public.merchants;
CREATE POLICY "Active merchants are viewable by authenticated users"
ON public.merchants FOR SELECT
TO authenticated
USING (is_active = true OR user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Merchants can update own shop profile" ON public.merchants;
CREATE POLICY "Merchants can update own shop profile"
ON public.merchants FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert or delete merchants" ON public.merchants;
CREATE POLICY "Admins can insert or delete merchants"
ON public.merchants FOR ALL
TO authenticated
USING (public.is_admin());

-- 3. DELIVERY PARTNERS POLICIES
DROP POLICY IF EXISTS "Partners can view own profile or admins view all" ON public.delivery_partners;
CREATE POLICY "Partners can view own profile or admins view all"
ON public.delivery_partners FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Partners can update own status and availability" ON public.delivery_partners;
CREATE POLICY "Partners can update own status and availability"
ON public.delivery_partners FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all delivery partners" ON public.delivery_partners;
CREATE POLICY "Admins can manage all delivery partners"
ON public.delivery_partners FOR ALL
TO authenticated
USING (public.is_admin());

-- 4. ORDERS POLICIES (Strict Customer-to-Customer Isolation, Merchant Suborder Visibility)
DROP POLICY IF EXISTS "Customers and merchants view relevant orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can only view their own orders" ON public.orders;
CREATE POLICY "Customers and merchants view relevant orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid() OR
  public.is_admin() OR
  public.fn_is_order_merchant(id, auth.uid())
);

DROP POLICY IF EXISTS "Customers can create orders for themselves" ON public.orders;
CREATE POLICY "Customers can create orders for themselves"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders"
ON public.orders FOR ALL
TO authenticated
USING (public.is_admin());

-- 5. MERCHANT SUBORDERS POLICIES
DROP POLICY IF EXISTS "Suborders viewable by shop owner, order customer, or admin" ON public.merchant_suborders;
CREATE POLICY "Suborders viewable by shop owner, order customer, or admin"
ON public.merchant_suborders FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()) OR
  public.fn_is_order_customer(order_id, auth.uid())
);

DROP POLICY IF EXISTS "Customers can insert suborders for own order" ON public.merchant_suborders;
CREATE POLICY "Customers can insert suborders for own order"
ON public.merchant_suborders FOR INSERT
TO authenticated
WITH CHECK (
  public.fn_is_order_customer(order_id, auth.uid()) OR
  public.is_admin()
);

DROP POLICY IF EXISTS "Admins can manage suborders" ON public.merchant_suborders;
CREATE POLICY "Admins can manage suborders"
ON public.merchant_suborders FOR ALL
TO authenticated
USING (public.is_admin());

-- 6. ORDER ITEMS POLICIES
DROP POLICY IF EXISTS "Order items viewable by authorized customer, merchant, or admin" ON public.order_items;
CREATE POLICY "Order items viewable by authorized customer, merchant, or admin"
ON public.order_items FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  suborder_id IN (
    SELECT ms.id FROM public.merchant_suborders ms
    JOIN public.merchants m ON ms.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ) OR
  suborder_id IN (
    SELECT ms.id FROM public.merchant_suborders ms
    WHERE public.fn_is_order_customer(ms.order_id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Customers can insert order items for own order" ON public.order_items;
CREATE POLICY "Customers can insert order items for own order"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (
  suborder_id IN (
    SELECT ms.id FROM public.merchant_suborders ms
    WHERE public.fn_is_order_customer(ms.order_id, auth.uid())
  ) OR
  public.is_admin()
);

DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins can manage order items"
ON public.order_items FOR ALL
TO authenticated
USING (public.is_admin());

-- 7. DELIVERY BATCHES POLICIES
DROP POLICY IF EXISTS "Batches viewable by assigned partner or admin" ON public.delivery_batches;
CREATE POLICY "Batches viewable by assigned partner or admin"
ON public.delivery_batches FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  id IN (
    SELECT da.batch_id FROM public.delivery_assignments da
    JOIN public.delivery_partners dp ON da.partner_id = dp.id
    WHERE dp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage delivery batches" ON public.delivery_batches;
CREATE POLICY "Admins can manage delivery batches"
ON public.delivery_batches FOR ALL
TO authenticated
USING (public.is_admin());

-- 8. BATCH ORDERS POLICIES
DROP POLICY IF EXISTS "Batch orders viewable by assigned partner, order customer, or admin" ON public.batch_orders;
CREATE POLICY "Batch orders viewable by assigned partner, order customer, or admin"
ON public.batch_orders FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()) OR
  batch_id IN (
    SELECT da.batch_id FROM public.delivery_assignments da
    JOIN public.delivery_partners dp ON da.partner_id = dp.id
    WHERE dp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage batch orders" ON public.batch_orders;
CREATE POLICY "Admins can manage batch orders"
ON public.batch_orders FOR ALL
TO authenticated
USING (public.is_admin());

-- 9. DELIVERY ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "Partners can view their offered and accepted assignments" ON public.delivery_assignments;
CREATE POLICY "Partners can view their offered and accepted assignments"
ON public.delivery_assignments FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage assignments" ON public.delivery_assignments;
CREATE POLICY "Admins can manage assignments"
ON public.delivery_assignments FOR ALL
TO authenticated
USING (public.is_admin());

-- 10. DELIVERY STOPS POLICIES
DROP POLICY IF EXISTS "Stops viewable by assigned partner, stop merchant, stop customer, or admin" ON public.delivery_stops;
CREATE POLICY "Stops viewable by assigned partner, stop merchant, stop customer, or admin"
ON public.delivery_stops FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  batch_id IN (
    SELECT da.batch_id FROM public.delivery_assignments da
    JOIN public.delivery_partners dp ON da.partner_id = dp.id
    WHERE dp.user_id = auth.uid() AND da.status = 'ACCEPTED'
  ) OR
  (merchant_id IS NOT NULL AND merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())) OR
  (order_id IS NOT NULL AND order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()))
);

DROP POLICY IF EXISTS "Admins can manage stops" ON public.delivery_stops;
CREATE POLICY "Admins can manage stops"
ON public.delivery_stops FOR ALL
TO authenticated
USING (public.is_admin());

-- 11. DELIVERY EVENTS POLICIES
DROP POLICY IF EXISTS "Events viewable by relevant actors or admins" ON public.delivery_events;
CREATE POLICY "Events viewable by relevant actors or admins"
ON public.delivery_events FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  actor_id = auth.uid() OR
  (order_id IS NOT NULL AND order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid())) OR
  (suborder_id IS NOT NULL AND suborder_id IN (
    SELECT ms.id FROM public.merchant_suborders ms
    JOIN public.merchants m ON ms.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ))
);

DROP POLICY IF EXISTS "Admins can insert events directly" ON public.delivery_events;
DROP POLICY IF EXISTS "Actors can insert delivery events" ON public.delivery_events;
CREATE POLICY "Actors can insert delivery events"
ON public.delivery_events FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid() OR
  public.is_admin()
);

-- 12. DELIVERY FEES POLICIES
DROP POLICY IF EXISTS "Customers view fees for own orders" ON public.delivery_fees;
CREATE POLICY "Customers view fees for own orders"
ON public.delivery_fees FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid())
);

DROP POLICY IF EXISTS "Customers insert fees for own orders" ON public.delivery_fees;
CREATE POLICY "Customers insert fees for own orders"
ON public.delivery_fees FOR INSERT
TO authenticated
WITH CHECK (
  public.fn_is_order_customer(order_id, auth.uid()) OR
  public.is_admin()
);

DROP POLICY IF EXISTS "Admins manage delivery fees" ON public.delivery_fees;
CREATE POLICY "Admins manage delivery fees"
ON public.delivery_fees FOR ALL
TO authenticated
USING (public.is_admin());
