-- NationX Shared Delivery — Migration 02: Tables, Indexes and SQL Constraints

-- Supabase Auth compatibility shim for standalone PostgreSQL environments
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  raw_user_meta_data JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 1. Users Profile Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
  email TEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone TEXT CHECK (phone IS NULL OR phone ~* '^\+?[0-9]{10,14}$'),
  role user_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON public.users USING gin (email gin_trgm_ops);

-- 2. Merchants Table
CREATE TABLE IF NOT EXISTS public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
  code TEXT NOT NULL UNIQUE CHECK (code ~* '^[A-Z0-9_-]{3,30}$'),
  address TEXT NOT NULL,
  locality TEXT NOT NULL,
  latitude DOUBLE PRECISION CHECK (latitude IS NULL OR (latitude BETWEEN -90.0 AND 90.0)),
  longitude DOUBLE PRECISION CHECK (longitude IS NULL OR (longitude BETWEEN -180.0 AND 180.0)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_merchants_locality ON public.merchants(locality);
CREATE INDEX IF NOT EXISTS idx_merchants_name_trgm ON public.merchants USING gin (name gin_trgm_ops);

-- 3. Delivery Partners Table
CREATE TABLE IF NOT EXISTS public.delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE RESTRICT,
  vehicle_type TEXT,
  capacity_units INT NOT NULL DEFAULT 5 CHECK (capacity_units > 0 AND capacity_units <= 50),
  availability partner_availability NOT NULL DEFAULT 'OFFLINE',
  current_locality TEXT,
  latitude DOUBLE PRECISION CHECK (latitude IS NULL OR (latitude BETWEEN -90.0 AND 90.0)),
  longitude DOUBLE PRECISION CHECK (longitude IS NULL OR (longitude BETWEEN -180.0 AND 180.0)),
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_partners_availability_locality ON public.delivery_partners(availability, current_locality);

-- 4. Customer Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'CONFIRMED',
  fulfillment_mode fulfillment_mode NOT NULL DEFAULT 'SHARED_DELIVERY',
  delivery_address TEXT NOT NULL,
  delivery_locality TEXT NOT NULL,
  delivery_latitude DOUBLE PRECISION CHECK (delivery_latitude IS NULL OR (delivery_latitude BETWEEN -90.0 AND 90.0)),
  delivery_longitude DOUBLE PRECISION CHECK (delivery_longitude IS NULL OR (delivery_longitude BETWEEN -180.0 AND 180.0)),
  delivery_window_start TIMESTAMPTZ,
  delivery_window_end TIMESTAMPTZ,
  dispatch_deadline TIMESTAMPTZ,
  customer_notes TEXT,
  payment_reference TEXT,
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT chk_delivery_window CHECK (
    delivery_window_end IS NULL OR 
    delivery_window_start IS NULL OR 
    delivery_window_end >= delivery_window_start
  )
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_locality ON public.orders(status, delivery_locality);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);

-- 5. Merchant Suborders Table
CREATE TABLE IF NOT EXISTS public.merchant_suborders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suborder_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
  status suborder_status NOT NULL DEFAULT 'PLACED',
  preparation_deadline TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  handed_over_at TIMESTAMPTZ,
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  merchant_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_suborders_merchant_status ON public.merchant_suborders(merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_suborders_order ON public.merchant_suborders(order_id);

-- 6. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suborder_id UUID NOT NULL REFERENCES public.merchant_suborders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL CHECK (char_length(trim(product_name)) >= 1),
  sku TEXT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  handling_tag TEXT,
  weight_units DOUBLE PRECISION CHECK (weight_units IS NULL OR weight_units > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_items_suborder ON public.order_items(suborder_id);

-- 7. Delivery Batches Table
CREATE TABLE IF NOT EXISTS public.delivery_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT NOT NULL UNIQUE,
  status batch_status NOT NULL DEFAULT 'DRAFT',
  locality TEXT NOT NULL,
  max_orders INT NOT NULL DEFAULT 8 CHECK (max_orders > 0 AND max_orders <= 20),
  capacity_units INT NOT NULL DEFAULT 10 CHECK (capacity_units > 0 AND capacity_units <= 100),
  estimated_distance_km DOUBLE PRECISION CHECK (estimated_distance_km IS NULL OR estimated_distance_km >= 0),
  estimated_duration_min INT CHECK (estimated_duration_min IS NULL OR estimated_duration_min >= 0),
  planned_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_batches_status_locality ON public.delivery_batches(status, locality);

-- 8. Batch Orders Junction Table
CREATE TABLE IF NOT EXISTS public.batch_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.delivery_batches(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  suborder_id UUID REFERENCES public.merchant_suborders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT uq_batch_order_suborder UNIQUE (batch_id, order_id, suborder_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_orders_order ON public.batch_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_batch_orders_batch ON public.batch_orders(batch_id);

-- 9. Delivery Assignments Table
CREATE TABLE IF NOT EXISTS public.delivery_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.delivery_batches(id) ON DELETE RESTRICT,
  partner_id UUID NOT NULL REFERENCES public.delivery_partners(id) ON DELETE RESTRICT,
  status assignment_status NOT NULL DEFAULT 'OFFERED',
  offered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  responded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_assignments_partner_status ON public.delivery_assignments(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_batch_status ON public.delivery_assignments(batch_id, status);

-- 10. Delivery Stops Table
CREATE TABLE IF NOT EXISTS public.delivery_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.delivery_batches(id) ON DELETE RESTRICT,
  sequence INT NOT NULL CHECK (sequence >= 1),
  type stop_type NOT NULL,
  status stop_status NOT NULL DEFAULT 'PENDING',
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT,
  suborder_id UUID REFERENCES public.merchant_suborders(id) ON DELETE RESTRICT,
  address TEXT NOT NULL,
  locality TEXT NOT NULL,
  latitude DOUBLE PRECISION CHECK (latitude IS NULL OR (latitude BETWEEN -90.0 AND 90.0)),
  longitude DOUBLE PRECISION CHECK (longitude IS NULL OR (longitude BETWEEN -180.0 AND 180.0)),
  instructions TEXT,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT uq_batch_stop_sequence UNIQUE (batch_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_stops_batch_status ON public.delivery_stops(batch_id, status);

-- 11. Delivery Events (Audit Log)
CREATE TABLE IF NOT EXISTS public.delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type delivery_event_type NOT NULL,
  message TEXT NOT NULL,
  reason TEXT,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  suborder_id UUID REFERENCES public.merchant_suborders(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.delivery_batches(id) ON DELETE SET NULL,
  metadata JSONB,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_events_order ON public.delivery_events(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_suborder ON public.delivery_events(suborder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_batch ON public.delivery_events(batch_id, created_at DESC);

-- 12. Delivery Fees Table
CREATE TABLE IF NOT EXISTS public.delivery_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  rule_code TEXT NOT NULL,
  is_demo_rule BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fees_order ON public.delivery_fees(order_id);

