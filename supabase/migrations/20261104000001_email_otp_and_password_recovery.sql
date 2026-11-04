-- ============================================================================
-- NATIONX SHARED DELIVERY & LOGISTICS
-- Migration: Email OTP Support & Password Recovery Token Tracking
-- ============================================================================

-- 1. Extend otp_verifications to support Email as well as Phone
ALTER TABLE public.otp_verifications 
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.otp_verifications 
  ALTER COLUMN phone DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_otp_email_created 
  ON public.otp_verifications(email, created_at DESC);

-- 2. Password Reset Tokens Table (Auditable & Expiring)
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash 
  ON public.password_reset_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_password_reset_user 
  ON public.password_reset_tokens(user_id, created_at DESC);

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS password_reset_admin ON public.password_reset_tokens;
CREATE POLICY password_reset_admin ON public.password_reset_tokens
  FOR ALL USING (public.is_admin());

-- Table permissions for service zone geometry inspection
GRANT SELECT ON public.service_zones TO authenticated, anon;
GRANT SELECT ON public.service_localities TO authenticated, anon;

