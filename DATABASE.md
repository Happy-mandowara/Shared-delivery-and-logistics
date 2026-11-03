# NationX Shared Delivery & Logistics — Database Specification

**Project 03: Supabase PostgreSQL 16 Schema, Security & Migration Reference**  
*Document Version: 2.0 (SQL-First Architecture)*

---

## 1. Database Architecture Overview

The database layer for NationX Shared Delivery is built directly on **Supabase PostgreSQL 16**. It is a **SQL-first architecture** where data integrity, tenancy isolation, and state machine transitions are enforced inside the database engine.

### Core Principles
1. **Zero Unprotected Tables**: PostgreSQL **Row Level Security (RLS)** is enabled on **every single table** without exception.
2. **Defensive Isolation**: Customers never see another customer's name, phone, address, items, or payment records. Merchants only see suborders designated for their shop. Delivery partners only see stops and suborder instructions for batches actively assigned to them.
3. **Atomic State Transitions**: Status updates that mutate delivery states or require auditing execute through `SECURITY DEFINER` stored procedures with an explicit and locked `search_path`.
4. **SQL-Level Integrity**: SQL `CHECK` constraints validate coordinates, positive amounts, capacity ranges, and state rules directly in the database alongside application-level Zod schemas.
5. **Fast Local Text Search**: Uses PostgreSQL's native `pg_trgm` (trigram) extension for fuzzy searching merchant names, localities, and items.
6. **No ORM Replacement**: Prisma is deprecated as the database layer. Schema migrations, functions, triggers, and policies are managed via pure SQL in `supabase/migrations/`.

---

## 2. PostgreSQL Extensions

```sql
-- Core Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";       -- Standard UUID utilities
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Trigram indexing for fuzzy search
```

---

## 3. Enumerated Types (Enums)

```sql
CREATE TYPE user_role AS ENUM (
  'ADMIN',
  'MERCHANT',
  'PARTNER',
  'CUSTOMER'
);

CREATE TYPE fulfillment_mode AS ENUM (
  'SHARED_DELIVERY',
  'EXPRESS',
  'CUSTOMER_PICKUP'
);

CREATE TYPE order_status AS ENUM (
  'CONFIRMED',
  'FULFILLING',
  'PARTIALLY_FULFILLED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE suborder_status AS ENUM (
  'PLACED',
  'ACCEPTED',
  'REJECTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'DELIVERED',
  'CANCELLED',
  'EXCEPTION'
);

CREATE TYPE batch_status AS ENUM (
  'DRAFT',
  'OPEN',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'EXCEPTION'
);

CREATE TYPE assignment_status AS ENUM (
  'OFFERED',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED'
);

CREATE TYPE partner_availability AS ENUM (
  'AVAILABLE',
  'BUSY',
  'OFFLINE',
  'SUSPENDED'
);

CREATE TYPE stop_type AS ENUM (
  'PICKUP',
  'DROPOFF',
  'CUSTOMER_PICKUP',
  'RETURN'
);

CREATE TYPE stop_status AS ENUM (
  'PENDING',
  'ARRIVED',
  'COMPLETED',
  'FAILED',
  'SKIPPED'
);

CREATE TYPE delivery_event_type AS ENUM (
  'ORDER_REQUESTED',
  'PARTNER_ASSIGNED',
  'ASSIGNMENT_ACCEPTED',
  'ASSIGNMENT_REJECTED',
  'MERCHANT_ACCEPTED',
  'PREPARATION_STARTED',
  'READY_FOR_PICKUP',
  'PICKUP_CONFIRMED',
  'IN_TRANSIT',
  'DELIVERY_ATTEMPTED',
  'DELIVERED',
  'FAILED',
  'CANCELLED',
  'REASSIGNED',
  'RETURN_REQUESTED',
  'RETURNED',
  'ADMIN_INTERVENTION',
  'NOTE'
);
```

---

## 4. Complete Table Schema & Constraints

### 4.1 `public.users` (Profile linked to Supabase Auth)
Synchronized with `auth.users` via database trigger.
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
  email TEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  phone TEXT CHECK (phone IS NULL OR phone ~* '^\+?[0-9]{10,14}$'),
  role user_role NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email_trgm ON public.users USING gin (email gin_trgm_ops);
```

### 4.2 `public.merchants`
```sql
CREATE TABLE public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
  code TEXT NOT NULL UNIQUE CHECK (code ~* '^[A-Z0-9_-]{3,20}$'),
  address TEXT NOT NULL,
  locality TEXT NOT NULL,
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90.0 AND 90.0),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180.0 AND 180.0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_merchants_locality ON public.merchants(locality);
CREATE INDEX idx_merchants_name_trgm ON public.merchants USING gin (name gin_trgm_ops);
```

### 4.3 `public.delivery_partners`
```sql
CREATE TABLE public.delivery_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE RESTRICT,
  vehicle_type TEXT,
  capacity_units INT NOT NULL DEFAULT 5 CHECK (capacity_units > 0 AND capacity_units <= 50),
  availability partner_availability NOT NULL DEFAULT 'OFFLINE',
  current_locality TEXT,
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90.0 AND 90.0),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180.0 AND 180.0),
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_partners_availability_locality ON public.delivery_partners(availability, current_locality);
```

### 4.4 `public.orders`
Original customer order. Remains independent and immutable across batches.
```sql
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'CONFIRMED',
  fulfillment_mode fulfillment_mode NOT NULL DEFAULT 'SHARED_DELIVERY',
  delivery_address TEXT NOT NULL,
  delivery_locality TEXT NOT NULL,
  delivery_latitude DOUBLE PRECISION CHECK (delivery_latitude BETWEEN -90.0 AND 90.0),
  delivery_longitude DOUBLE PRECISION CHECK (delivery_longitude BETWEEN -180.0 AND 180.0),
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

CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status_locality ON public.orders(status, delivery_locality);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);
```

### 4.5 `public.merchant_suborders`
Individual merchant suborder for items originating from a single shop.
```sql
CREATE TABLE public.merchant_suborders (
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

CREATE INDEX idx_suborders_merchant_status ON public.merchant_suborders(merchant_id, status);
CREATE INDEX idx_suborders_order ON public.merchant_suborders(order_id);
```

### 4.6 `public.order_items`
```sql
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suborder_id UUID NOT NULL REFERENCES public.merchant_suborders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  handling_tag TEXT,
  weight_units DOUBLE PRECISION CHECK (weight_units IS NULL OR weight_units > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_order_items_suborder ON public.order_items(suborder_id);
```

### 4.7 `public.delivery_batches`
Operational logistics grouping of compatible suborders and deliveries.
```sql
CREATE TABLE public.delivery_batches (
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

CREATE INDEX idx_batches_status_locality ON public.delivery_batches(status, locality);
```

### 4.8 `public.batch_orders`
Junction table linking orders and suborders into an operational batch.
```sql
CREATE TABLE public.batch_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.delivery_batches(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  suborder_id UUID REFERENCES public.merchant_suborders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT uq_batch_order_suborder UNIQUE (batch_id, order_id, suborder_id)
);

CREATE INDEX idx_batch_orders_order ON public.batch_orders(order_id);
CREATE INDEX idx_batch_orders_batch ON public.batch_orders(batch_id);
```

### 4.9 `public.delivery_assignments`
```sql
CREATE TABLE public.delivery_assignments (
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

CREATE INDEX idx_assignments_partner_status ON public.delivery_assignments(partner_id, status);
CREATE INDEX idx_assignments_batch_status ON public.delivery_assignments(batch_id, status);
```

### 4.10 `public.delivery_stops`
Ordered sequence of physical collection (shop) and delivery (customer) stops.
```sql
CREATE TABLE public.delivery_stops (
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
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90.0 AND 90.0),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180.0 AND 180.0),
  instructions TEXT,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT uq_batch_stop_sequence UNIQUE (batch_id, sequence)
);

CREATE INDEX idx_stops_batch_status ON public.delivery_stops(batch_id, status);
```

### 4.11 `public.delivery_events`
Immutable audit log of all domain events, partner state changes, and administrative overrides.
```sql
CREATE TABLE public.delivery_events (
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

CREATE INDEX idx_events_order ON public.delivery_events(order_id, created_at DESC);
CREATE INDEX idx_events_suborder ON public.delivery_events(suborder_id, created_at DESC);
CREATE INDEX idx_events_batch ON public.delivery_events(batch_id, created_at DESC);
```

### 4.12 `public.delivery_fees`
```sql
CREATE TABLE public.delivery_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  rule_code TEXT NOT NULL,
  is_demo_rule BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_fees_order ON public.delivery_fees(order_id);
```

---

## 5. Row Level Security (RLS) Strategy & Policies

Row Level Security is enabled on **EVERY** table:
```sql
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
```

### Policy Definitions

#### Helper Functions for Role Checking
```sql
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
```

#### Order Isolation Policies
```sql
-- Customers see only their own orders
CREATE POLICY "Customers view own orders"
ON public.orders FOR SELECT
TO authenticated
USING (customer_id = auth.uid() OR public.is_admin());

-- Admins manage all orders
CREATE POLICY "Admins manage orders"
ON public.orders FOR ALL
TO authenticated
USING (public.is_admin());
```

#### Merchant Suborder Policies
```sql
-- Merchants see suborders for their own shop; customers see suborders for their parent order
CREATE POLICY "Merchants and Customers view relevant suborders"
ON public.merchant_suborders FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()) OR
  order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid())
);
```

#### Delivery Partner Assignment & Stop Policies
```sql
-- Partners can only view assignments made to their profile
CREATE POLICY "Partners view own assignments"
ON public.delivery_assignments FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = auth.uid())
);

-- Partners view stops for batches assigned to them and accepted
CREATE POLICY "Partners view assigned stops"
ON public.delivery_stops FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  batch_id IN (
    SELECT da.batch_id FROM public.delivery_assignments da
    JOIN public.delivery_partners dp ON da.partner_id = dp.id
    WHERE dp.user_id = auth.uid() AND da.status = 'ACCEPTED'
  )
);
```

#### Audit Event Policies
```sql
-- Users see events attached to their orders, suborders or assigned batches
CREATE POLICY "Users view relevant audit events"
ON public.delivery_events FOR SELECT
TO authenticated
USING (
  public.is_admin() OR
  order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()) OR
  suborder_id IN (
    SELECT ms.id FROM public.merchant_suborders ms
    JOIN public.merchants m ON ms.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  )
);
```

---

## 6. Protected State Machine Functions (`SECURITY DEFINER`)

All critical mutations execute inside secure SQL stored procedures that bypass standard RLS restrictions under tightly verified rules.

### Safe Search Path & Privileges Standard
Every function:
1. Declares `SECURITY DEFINER`.
2. Explicitly locks search path: `SET search_path = public, pg_temp;`.
3. Revokes default execution privileges: `REVOKE ALL ON FUNCTION ... FROM PUBLIC;`.
4. Grants execution strictly to `authenticated`: `GRANT EXECUTE ON FUNCTION ... TO authenticated;`.

### Key State Transition Functions

#### 1. Merchant Marks Suborder Ready: `fn_mark_suborder_ready`
```sql
CREATE OR REPLACE FUNCTION public.fn_mark_suborder_ready(
  p_suborder_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_merchant_user_id UUID;
  v_current_status suborder_status;
  v_order_id UUID;
BEGIN
  -- Verify caller is merchant owner or admin
  SELECT m.user_id, ms.status, ms.order_id
  INTO v_merchant_user_id, v_current_status, v_order_id
  FROM public.merchant_suborders ms
  JOIN public.merchants m ON ms.merchant_id = m.id
  WHERE ms.id = p_suborder_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suborder % not found', p_suborder_id USING ERRCODE = 'P0002';
  END IF;

  IF v_merchant_user_id != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Caller does not own merchant shop' USING ERRCODE = '42501';
  END IF;

  -- Validate state machine: must be PREPARING or ACCEPTED
  IF v_current_status NOT IN ('ACCEPTED', 'PREPARING') THEN
    RAISE EXCEPTION 'Cannot mark ready from current status %', v_current_status USING ERRCODE = '22023';
  END IF;

  -- Update suborder
  UPDATE public.merchant_suborders
  SET status = 'READY_FOR_PICKUP',
      ready_at = timezone('utc'::text, now()),
      merchant_notes = COALESCE(p_notes, merchant_notes),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_suborder_id;

  -- Log audit event
  INSERT INTO public.delivery_events (
    type, message, reason, actor_id, order_id, suborder_id
  ) VALUES (
    'READY_FOR_PICKUP',
    'Merchant marked suborder ready for pickup',
    p_notes,
    auth.uid(),
    v_order_id,
    p_suborder_id
  );

  RETURN jsonb_build_object(
    'suborder_id', p_suborder_id,
    'status', 'READY_FOR_PICKUP',
    'ready_at', timezone('utc'::text, now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_mark_suborder_ready(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_mark_suborder_ready(UUID, TEXT) TO authenticated;
```

#### 2. Partner Responds to Assignment: `fn_respond_assignment`
```sql
CREATE OR REPLACE FUNCTION public.fn_respond_assignment(
  p_assignment_id UUID,
  p_accept BOOLEAN,
  p_reason TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_partner_user_id UUID;
  v_batch_id UUID;
  v_current_status assignment_status;
  v_new_assignment_status assignment_status;
  v_new_batch_status batch_status;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.delivery_assignments WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('idempotent', true, 'assignment_id', p_assignment_id);
  END IF;

  SELECT dp.user_id, da.batch_id, da.status
  INTO v_partner_user_id, v_batch_id, v_current_status
  FROM public.delivery_assignments da
  JOIN public.delivery_partners dp ON da.partner_id = dp.id
  WHERE da.id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment % not found', p_assignment_id USING ERRCODE = 'P0002';
  END IF;

  IF v_partner_user_id != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not the assigned partner' USING ERRCODE = '42501';
  END IF;

  IF v_current_status != 'OFFERED' THEN
    RAISE EXCEPTION 'Assignment is not in OFFERED state (current: %)', v_current_status USING ERRCODE = '22023';
  END IF;

  IF p_accept THEN
    v_new_assignment_status := 'ACCEPTED';
    v_new_batch_status := 'ACCEPTED';
  ELSE
    v_new_assignment_status := 'REJECTED';
    v_new_batch_status := 'OPEN'; -- Re-open batch for another partner
  END IF;

  UPDATE public.delivery_assignments
  SET status = v_new_assignment_status,
      responded_at = timezone('utc'::text, now()),
      idempotency_key = p_idempotency_key
  WHERE id = p_assignment_id;

  UPDATE public.delivery_batches
  SET status = v_new_batch_status,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_batch_id;

  -- Audit log
  INSERT INTO public.delivery_events (
    type, message, reason, actor_id, batch_id, idempotency_key
  ) VALUES (
    CASE WHEN p_accept THEN 'ASSIGNMENT_ACCEPTED'::delivery_event_type ELSE 'ASSIGNMENT_REJECTED'::delivery_event_type END,
    CASE WHEN p_accept THEN 'Partner accepted delivery batch' ELSE 'Partner rejected delivery batch' END,
    p_reason,
    auth.uid(),
    v_batch_id,
    p_idempotency_key
  );

  RETURN jsonb_build_object(
    'assignment_id', p_assignment_id,
    'status', v_new_assignment_status,
    'batch_status', v_new_batch_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_respond_assignment(UUID, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_respond_assignment(UUID, BOOLEAN, TEXT, TEXT) TO authenticated;
```

---

## 7. Migration & Seed Strategy

All database changes are captured as incremental, versioned SQL migration files:
```
supabase/
├── migrations/
│   ├── 20261103000001_create_extensions_and_enums.sql
│   ├── 20261103000002_create_tables_and_indexes.sql
│   ├── 20261103000003_enable_rls_and_policies.sql
│   └── 20261103000004_create_state_functions.sql
├── seed.sql
└── tests/
    └── rls_and_transitions.test.sql
```

### Applying Migrations
- **Local Development**:
  ```bash
  supabase db reset
  ```
- **Seed Data Execution**:
  Seeds deterministic demo data including:
  - 1 Operations Administrator (`admin@nationx.local`)
  - 3 Distinct Merchants in Khammam (`Bawarchi Biryani`, `Balaji Kirana`, `Sri Krishna Sweets`)
  - 3 Distinct Customers (`customer1@nationx.local`, `customer2@nationx.local`, `customer3@nationx.local`)
  - 2 Delivery Partners (1 available, 1 offline)
  - 3 Compatible Confirmed Orders ready for shared batch creation.

