-- ============================================================================
-- NATIONX SHARED DELIVERY & LOGISTICS — PHASE 5.5
-- Migration: Marketplace Catalog Enhancements, Merchant Onboarding,
-- Wishlist, Customer Complaints, Incident Reports & Phone OTP Verification
-- ============================================================================

-- 1. Alter public.products to support multi-images, units, variants, and archiving
DO $$ BEGIN
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'piece';
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]';
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight_grams INT DEFAULT 0;
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. Alter public.merchants to support logos, banners, galleries, categories, and ratings
DO $$ BEGIN
  ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS logo_url TEXT;
  ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS cover_url TEXT;
  ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}';
  ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General Store';
  ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS contact_phone TEXT;
  ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{"open":"08:00","close":"21:00","closed_days":[]}';
  ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 4.5;
  ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;
  ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3. Create Customer Wishlists Table
CREATE TABLE IF NOT EXISTS public.customer_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_customer_product_wishlist UNIQUE (customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_customer ON public.customer_wishlists(customer_id);

-- 4. Create Merchant Onboarding Drafts Table (Airbnb-style 10-step wizard)
CREATE TABLE IF NOT EXISTS public.merchant_onboarding_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  step INT NOT NULL DEFAULT 1,
  completed_steps INT[] DEFAULT '{}',
  form_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_merchant_draft_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_merchant_drafts_user ON public.merchant_onboarding_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_drafts_status ON public.merchant_onboarding_drafts(status);

-- 5. Create Customer Complaints Table
CREATE TABLE IF NOT EXISTS public.customer_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  suborder_id UUID REFERENCES public.merchant_suborders(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  complaint_type TEXT NOT NULL CHECK (complaint_type IN (
    'DAMAGED_PRODUCT',
    'EXPIRED_PRODUCT',
    'MISSING_ITEM',
    'POOR_QUALITY',
    'INCORRECT_QUANTITY',
    'DELIVERY_DELAY',
    'MISCONDUCT',
    'PAYMENT_ISSUE',
    'OTHER'
  )),
  item_name TEXT,
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN (
    'SUBMITTED',
    'UNDER_INVESTIGATION',
    'MERCHANT_RESPONSE',
    'RESOLVED',
    'REJECTED'
  )),
  resolution_action TEXT CHECK (resolution_action IS NULL OR resolution_action IN (
    'REPLACEMENT_ISSUED',
    'PARTIAL_REFUND',
    'FULL_REFUND',
    'DISMISSED'
  )),
  refund_amount NUMERIC(10,2) DEFAULT 0.00,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_complaints_order ON public.customer_complaints(order_id);
CREATE INDEX IF NOT EXISTS idx_complaints_customer ON public.customer_complaints(customer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.customer_complaints(status);

-- 6. Create Incident Reports Table (For Delivery Partners)
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.delivery_partners(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.delivery_batches(id) ON DELETE SET NULL,
  stop_id UUID REFERENCES public.delivery_stops(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'CUSTOMER_UNREACHABLE',
    'INCORRECT_ADDRESS',
    'MERCHANT_DELAY',
    'VEHICLE_BREAKDOWN',
    'ACCIDENT_SAFETY',
    'PACKAGE_DAMAGED',
    'CUSTOMER_DISPUTE',
    'EXTREME_WEATHER',
    'OTHER'
  )),
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'REPORTED' CHECK (status IN ('REPORTED', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_incidents_partner ON public.incident_reports(partner_id);
CREATE INDEX IF NOT EXISTS idx_incidents_batch ON public.incident_reports(batch_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incident_reports(status);

-- 7. Create OTP Verifications Table
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_otp_phone_created ON public.otp_verifications(phone, created_at DESC);

-- Enable RLS on all newly created tables
ALTER TABLE public.customer_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_onboarding_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- 8. Row Level Security Policies

-- Customer Wishlists Policies
DROP POLICY IF EXISTS wishlists_select ON public.customer_wishlists;
CREATE POLICY wishlists_select ON public.customer_wishlists
  FOR SELECT USING (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS wishlists_insert ON public.customer_wishlists;
CREATE POLICY wishlists_insert ON public.customer_wishlists
  FOR INSERT WITH CHECK (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS wishlists_delete ON public.customer_wishlists;
CREATE POLICY wishlists_delete ON public.customer_wishlists
  FOR DELETE USING (customer_id = auth.uid() OR public.is_admin());

-- Merchant Onboarding Drafts Policies
DROP POLICY IF EXISTS merchant_drafts_select ON public.merchant_onboarding_drafts;
CREATE POLICY merchant_drafts_select ON public.merchant_onboarding_drafts
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS merchant_drafts_all ON public.merchant_onboarding_drafts;
CREATE POLICY merchant_drafts_all ON public.merchant_onboarding_drafts
  FOR ALL USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Customer Complaints Policies
DROP POLICY IF EXISTS complaints_select ON public.customer_complaints;
CREATE POLICY complaints_select ON public.customer_complaints
  FOR SELECT USING (
    customer_id = auth.uid() 
    OR public.is_admin()
    OR suborder_id IN (
      SELECT ms.id FROM public.merchant_suborders ms
      JOIN public.merchants m ON ms.merchant_id = m.id
      WHERE m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS complaints_insert ON public.customer_complaints;
CREATE POLICY complaints_insert ON public.customer_complaints
  FOR INSERT WITH CHECK (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS complaints_admin_update ON public.customer_complaints;
CREATE POLICY complaints_admin_update ON public.customer_complaints
  FOR UPDATE USING (public.is_admin() OR suborder_id IN (
    SELECT ms.id FROM public.merchant_suborders ms
    JOIN public.merchants m ON ms.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ));

-- Incident Reports Policies
DROP POLICY IF EXISTS incidents_select ON public.incident_reports;
CREATE POLICY incidents_select ON public.incident_reports
  FOR SELECT USING (
    partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS incidents_insert ON public.incident_reports;
CREATE POLICY incidents_insert ON public.incident_reports
  FOR INSERT WITH CHECK (
    partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS incidents_update ON public.incident_reports;
CREATE POLICY incidents_update ON public.incident_reports
  FOR UPDATE USING (public.is_admin());

-- OTP Verifications (Internal only, managed via backend functions / admins)
DROP POLICY IF EXISTS otp_admin ON public.otp_verifications;
CREATE POLICY otp_admin ON public.otp_verifications
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
