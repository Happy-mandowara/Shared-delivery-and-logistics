-- ============================================================================
-- NATIONX SHARED DELIVERY & LOGISTICS — PHASE 5.4
-- Migration: Service Zones, Partner Settlements & Exception State Machines
-- ============================================================================

-- 1. Create Settlement Status Enum
DO $$ BEGIN
  CREATE TYPE settlement_status AS ENUM (
    'PENDING',
    'APPROVED',
    'DISBURSED',
    'ON_HOLD'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create Service Zones Table
CREATE TABLE IF NOT EXISTS public.service_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~* '^[A-Z0-9_-]{3,50}$'),
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
  city TEXT NOT NULL CHECK (char_length(trim(city)) >= 2),
  state TEXT NOT NULL DEFAULT 'Telangana',
  center_latitude DOUBLE PRECISION NOT NULL CHECK (center_latitude BETWEEN -90.0 AND 90.0),
  center_longitude DOUBLE PRECISION NOT NULL CHECK (center_longitude BETWEEN -180.0 AND 180.0),
  radius_km DOUBLE PRECISION NOT NULL DEFAULT 10.0 CHECK (radius_km > 0 AND radius_km <= 100),
  operating_hours_start TIME NOT NULL DEFAULT '07:00:00',
  operating_hours_end TIME NOT NULL DEFAULT '22:00:00',
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_batch_orders INT NOT NULL DEFAULT 4 CHECK (max_batch_orders > 0 AND max_batch_orders <= 20),
  max_batch_capacity INT NOT NULL DEFAULT 10 CHECK (max_batch_capacity > 0 AND max_batch_capacity <= 100),
  base_delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 35.00 CHECK (base_delivery_fee >= 0),
  per_km_fee NUMERIC(10, 2) NOT NULL DEFAULT 10.00 CHECK (per_km_fee >= 0),
  min_order_subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (min_order_subtotal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_service_zones_city ON public.service_zones(city, is_active);
CREATE INDEX IF NOT EXISTS idx_service_zones_code ON public.service_zones(code);

-- 3. Create Service Localities Table
CREATE TABLE IF NOT EXISTS public.service_localities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.service_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
  code TEXT NOT NULL UNIQUE CHECK (code ~* '^[A-Z0-9_-]{3,50}$'),
  latitude DOUBLE PRECISION CHECK (latitude IS NULL OR (latitude BETWEEN -90.0 AND 90.0)),
  longitude DOUBLE PRECISION CHECK (longitude IS NULL OR (longitude BETWEEN -180.0 AND 180.0)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_service_localities_zone ON public.service_localities(zone_id, is_active);
CREATE INDEX IF NOT EXISTS idx_service_localities_code ON public.service_localities(code);

-- 4. Create Partner Settlements Table
CREATE TABLE IF NOT EXISTS public.partner_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.delivery_partners(id) ON DELETE RESTRICT,
  batch_id UUID NOT NULL REFERENCES public.delivery_batches(id) ON DELETE RESTRICT,
  base_payout NUMERIC(10, 2) NOT NULL DEFAULT 40.00 CHECK (base_payout >= 0),
  stop_allowance NUMERIC(10, 2) NOT NULL DEFAULT 15.00 CHECK (stop_allowance >= 0),
  distance_payout NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (distance_payout >= 0),
  total_payout NUMERIC(10, 2) NOT NULL CHECK (total_payout >= 0),
  stops_completed INT NOT NULL DEFAULT 0 CHECK (stops_completed >= 0),
  status settlement_status NOT NULL DEFAULT 'PENDING',
  settlement_notes TEXT NOT NULL DEFAULT 'DEMO POLICY - PROVISIONAL EARNINGS ESTIMATE',
  disbursed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  CONSTRAINT uq_batch_partner_settlement UNIQUE (batch_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_settlements_partner ON public.partner_settlements(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_settlements_batch ON public.partner_settlements(batch_id);

-- Enable RLS on newly created tables
ALTER TABLE public.service_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_localities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Service Zones (Public read for active, Admin full manage)
DROP POLICY IF EXISTS service_zones_select ON public.service_zones;
CREATE POLICY service_zones_select ON public.service_zones
  FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS service_zones_admin ON public.service_zones;
CREATE POLICY service_zones_admin ON public.service_zones
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- RLS Policies for Service Localities
DROP POLICY IF EXISTS service_localities_select ON public.service_localities;
CREATE POLICY service_localities_select ON public.service_localities
  FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS service_localities_admin ON public.service_localities;
CREATE POLICY service_localities_admin ON public.service_localities
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- RLS Policies for Partner Settlements (Partner sees own, Admin sees all)
DROP POLICY IF EXISTS partner_settlements_partner ON public.partner_settlements;
CREATE POLICY partner_settlements_partner ON public.partner_settlements
  FOR SELECT
  USING (
    partner_id IN (SELECT id FROM public.delivery_partners WHERE user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS partner_settlements_admin ON public.partner_settlements;
CREATE POLICY partner_settlements_admin ON public.partner_settlements
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Stored Procedure: Calculate and Record Partner Settlement
CREATE OR REPLACE FUNCTION public.fn_calculate_partner_settlement(
  p_batch_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_batch RECORD;
  v_assignment RECORD;
  v_completed_stops INT;
  v_base_payout NUMERIC(10, 2) := 40.00;
  v_stop_allowance NUMERIC(10, 2) := 15.00;
  v_distance_rate NUMERIC(10, 2) := 5.00; -- Rs 5 per km beyond 2 km
  v_distance_payout NUMERIC(10, 2) := 0.00;
  v_total_payout NUMERIC(10, 2);
  v_settlement_id UUID;
BEGIN
  -- 1. Fetch batch
  SELECT * INTO v_batch FROM public.delivery_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id USING ERRCODE = 'P0002';
  END IF;

  -- 2. Fetch accepted partner assignment
  SELECT * INTO v_assignment 
  FROM public.delivery_assignments 
  WHERE batch_id = p_batch_id AND status = 'ACCEPTED';

  IF NOT FOUND THEN
    -- Try any assignment
    SELECT * INTO v_assignment 
    FROM public.delivery_assignments 
    WHERE batch_id = p_batch_id 
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_assignment.partner_id IS NULL THEN
    RAISE EXCEPTION 'No partner assigned to batch %', p_batch_id USING ERRCODE = '22023';
  END IF;

  -- 3. Count completed drop-off stops
  SELECT count(*)::int INTO v_completed_stops
  FROM public.delivery_stops
  WHERE batch_id = p_batch_id AND status = 'COMPLETED' AND type = 'DROPOFF';

  -- 4. Calculate distance payout if estimated distance > 2.0 km
  IF v_batch.estimated_distance_km IS NOT NULL AND v_batch.estimated_distance_km > 2.0 THEN
    v_distance_payout := round(((v_batch.estimated_distance_km - 2.0) * v_distance_rate)::numeric, 2);
  END IF;

  v_total_payout := v_base_payout + (v_completed_stops * v_stop_allowance) + v_distance_payout;

  -- 5. Insert or update partner settlement
  INSERT INTO public.partner_settlements (
    partner_id,
    batch_id,
    base_payout,
    stop_allowance,
    distance_payout,
    total_payout,
    stops_completed,
    status,
    settlement_notes
  )
  VALUES (
    v_assignment.partner_id,
    p_batch_id,
    v_base_payout,
    v_stop_allowance * v_completed_stops,
    v_distance_payout,
    v_total_payout,
    v_completed_stops,
    'PENDING',
    'DEMO POLICY - Rs ' || v_base_payout || ' base + Rs ' || v_stop_allowance || '/drop + Rs ' || v_distance_payout || ' distance'
  )
  ON CONFLICT (batch_id, partner_id) DO UPDATE SET
    base_payout = EXCLUDED.base_payout,
    stop_allowance = EXCLUDED.stop_allowance,
    distance_payout = EXCLUDED.distance_payout,
    total_payout = EXCLUDED.total_payout,
    stops_completed = EXCLUDED.stops_completed,
    settlement_notes = EXCLUDED.settlement_notes
  RETURNING id INTO v_settlement_id;

  -- 6. Log audit event
  INSERT INTO public.delivery_events (
    type,
    message,
    batch_id,
    actor_id,
    metadata
  )
  VALUES (
    'NOTE',
    'Generated partner settlement of Rs ' || v_total_payout || ' for batch ' || v_batch.batch_code,
    p_batch_id,
    auth.uid(),
    jsonb_build_object(
      'settlement_id', v_settlement_id,
      'partner_id', v_assignment.partner_id,
      'total_payout', v_total_payout,
      'stops_completed', v_completed_stops
    )
  );

  RETURN jsonb_build_object(
    'settlement_id', v_settlement_id,
    'partner_id', v_assignment.partner_id,
    'total_payout', v_total_payout,
    'stops_completed', v_completed_stops
  );
END;
$$;

-- 6. Stored Procedure: Reassign Delivery Batch
CREATE OR REPLACE FUNCTION public.fn_reassign_batch(
  p_batch_id UUID,
  p_new_partner_id UUID,
  p_reason TEXT,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_batch RECORD;
  v_old_assignment RECORD;
  v_new_assignment_id UUID;
BEGIN
  -- Admin only
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only dispatch admin can reassign batches' USING ERRCODE = '42501';
  END IF;

  -- Idempotency
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.delivery_events WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('idempotent', true, 'batch_id', p_batch_id);
  END IF;

  SELECT * INTO v_batch FROM public.delivery_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id USING ERRCODE = 'P0002';
  END IF;

  IF v_batch.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Cannot reassign completed batch' USING ERRCODE = '22023';
  END IF;

  -- Mark existing offered/accepted assignment as cancelled
  SELECT * INTO v_old_assignment 
  FROM public.delivery_assignments 
  WHERE batch_id = p_batch_id AND status IN ('OFFERED', 'ACCEPTED')
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    UPDATE public.delivery_assignments 
    SET status = 'CANCELLED' 
    WHERE id = v_old_assignment.id;
  END IF;

  -- Create new assignment for replacement partner
  INSERT INTO public.delivery_assignments (
    batch_id,
    partner_id,
    status
  )
  VALUES (
    p_batch_id,
    p_new_partner_id,
    'OFFERED'
  )
  RETURNING id INTO v_new_assignment_id;

  -- Update batch status
  UPDATE public.delivery_batches
  SET status = 'ASSIGNED', updated_at = timezone('utc'::text, now())
  WHERE id = p_batch_id;

  -- Audit event
  INSERT INTO public.delivery_events (
    type,
    message,
    batch_id,
    actor_id,
    reason,
    idempotency_key,
    metadata
  )
  VALUES (
    'REASSIGNED',
    'Batch reassigned to delivery partner ' || p_new_partner_id,
    p_batch_id,
    auth.uid(),
    p_reason,
    p_idempotency_key,
    jsonb_build_object(
      'old_partner_id', v_old_assignment.partner_id,
      'new_partner_id', p_new_partner_id,
      'new_assignment_id', v_new_assignment_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'new_assignment_id', v_new_assignment_id
  );
END;
$$;

-- 7. Stored Procedure: Handle Stop Delivery Exception & Return Trigger
CREATE OR REPLACE FUNCTION public.fn_handle_delivery_exception(
  p_stop_id UUID,
  p_reason TEXT,
  p_create_return_stop BOOLEAN DEFAULT false,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stop RECORD;
  v_suborder RECORD;
  v_return_stop_id UUID;
  v_max_seq INT;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.delivery_events WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('idempotent', true, 'stop_id', p_stop_id);
  END IF;

  SELECT ds.*, bo.suborder_id AS resolved_suborder_id
  INTO v_stop
  FROM public.delivery_stops ds
  LEFT JOIN public.batch_orders bo ON ds.order_id = bo.order_id
  WHERE ds.id = p_stop_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stop % not found', p_stop_id USING ERRCODE = 'P0002';
  END IF;

  -- Update stop to FAILED
  UPDATE public.delivery_stops
  SET 
    status = 'FAILED',
    failure_reason = p_reason,
    completed_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_stop_id;

  -- If it was a DROPOFF stop and an order is attached
  IF v_stop.order_id IS NOT NULL THEN
    -- Mark order as EXCEPTION
    UPDATE public.orders
    SET status = 'CANCELLED', updated_at = timezone('utc'::text, now())
    WHERE id = v_stop.order_id;

    -- If customer drop-off failed and items need return to shop
    IF p_create_return_stop AND v_stop.merchant_id IS NOT NULL THEN
      SELECT coalesce(max(sequence), 10) INTO v_max_seq
      FROM public.delivery_stops WHERE batch_id = v_stop.batch_id;

      INSERT INTO public.delivery_stops (
        batch_id,
        sequence,
        type,
        status,
        merchant_id,
        order_id,
        suborder_id,
        address,
        locality,
        instructions
      )
      VALUES (
        v_stop.batch_id,
        v_max_seq + 1,
        'RETURN',
        'PENDING',
        v_stop.merchant_id,
        v_stop.order_id,
        v_stop.suborder_id,
        'Return to Shop Counter',
        v_stop.locality,
        'Undelivered parcel return: ' || coalesce(p_reason, 'Customer unavailable')
      )
      RETURNING id INTO v_return_stop_id;
    END IF;

    -- Notify customer
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      order_id
    )
    SELECT 
      customer_id,
      'DELIVERY_FAILED',
      'Delivery Attempt Unsuccessful',
      'Delivery partner could not complete drop-off: ' || coalesce(p_reason, 'Customer unavailable'),
      v_stop.order_id
    FROM public.orders
    WHERE id = v_stop.order_id;
  END IF;

  -- If it was a PICKUP stop and merchant was unable to provide items
  IF v_stop.type = 'PICKUP' AND v_stop.suborder_id IS NOT NULL THEN
    UPDATE public.merchant_suborders
    SET status = 'CANCELLED', updated_at = timezone('utc'::text, now())
    WHERE id = v_stop.suborder_id;
  END IF;

  -- Log audit event
  INSERT INTO public.delivery_events (
    type,
    message,
    batch_id,
    order_id,
    suborder_id,
    actor_id,
    reason,
    idempotency_key,
    metadata
  )
  VALUES (
    'FAILED',
    'Delivery stop failed: ' || coalesce(p_reason, 'Exception recorded'),
    v_stop.batch_id,
    v_stop.order_id,
    v_stop.suborder_id,
    auth.uid(),
    p_reason,
    p_idempotency_key,
    jsonb_build_object(
      'stop_id', p_stop_id,
      'return_stop_id', v_return_stop_id,
      'stop_type', v_stop.type
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'stop_id', p_stop_id,
    'return_stop_id', v_return_stop_id
  );
END;
$$;

-- 8. Stored Procedure: Cancel Order with Audit & Suborder Cascade
CREATE OR REPLACE FUNCTION public.fn_cancel_order(
  p_order_id UUID,
  p_reason TEXT,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_suborder RECORD;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.delivery_events WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('idempotent', true, 'order_id', p_order_id);
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id USING ERRCODE = 'P0002';
  END IF;

  -- Only Customer owner or Admin can cancel
  IF NOT public.is_admin() AND v_order.customer_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Only order customer or admin can cancel order' USING ERRCODE = '42501';
  END IF;

  -- Cannot cancel if already completed
  IF v_order.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Cannot cancel completed order' USING ERRCODE = '22023';
  END IF;

  -- Update order status
  UPDATE public.orders
  SET status = 'CANCELLED', updated_at = timezone('utc'::text, now())
  WHERE id = p_order_id;

  -- Update suborders
  UPDATE public.merchant_suborders
  SET status = 'CANCELLED', updated_at = timezone('utc'::text, now())
  WHERE order_id = p_order_id AND status != 'DELIVERED';

  -- Notify Customer
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    order_id
  )
  VALUES (
    v_order.customer_id,
    'SYSTEM_ALERT',
    'Order Cancelled',
    'Your order #' || v_order.order_number || ' has been cancelled: ' || coalesce(p_reason, 'Customer requested cancellation'),
    p_order_id
  );

  -- Audit event
  INSERT INTO public.delivery_events (
    type,
    message,
    order_id,
    actor_id,
    reason,
    idempotency_key,
    metadata
  )
  VALUES (
    'CANCELLED',
    'Order #' || v_order.order_number || ' cancelled: ' || coalesce(p_reason, 'User initiated cancellation'),
    p_order_id,
    auth.uid(),
    p_reason,
    p_idempotency_key,
    jsonb_build_object('order_id', p_order_id, 'reason', p_reason)
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'CANCELLED'
  );
END;
$$;

-- 9. Update fn_update_stop_status to Auto-Calculate Partner Settlement on Batch Completion
CREATE OR REPLACE FUNCTION public.fn_update_stop_status(
  p_stop_id UUID,
  p_status stop_status,
  p_failure_reason TEXT DEFAULT NULL,
  p_pod_code TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stop RECORD;
  v_order RECORD;
  v_partner_user_id UUID;
  v_assignment_status assignment_status;
  v_pending_pickup_count INT;
  v_remaining_stops INT;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.delivery_events WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('idempotent', true, 'stop_id', p_stop_id);
  END IF;

  -- 1. Fetch stop and assignment details
  SELECT ds.*, dp.user_id AS partner_user_id, da.status AS assignment_status
  INTO v_stop
  FROM public.delivery_stops ds
  LEFT JOIN public.delivery_assignments da ON ds.batch_id = da.batch_id AND da.status = 'ACCEPTED'
  LEFT JOIN public.delivery_partners dp ON da.partner_id = dp.id
  WHERE ds.id = p_stop_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stop % not found', p_stop_id USING ERRCODE = 'P0002';
  END IF;

  -- 2. Authorization: Must be assigned partner with an ACCEPTED assignment or Admin
  IF NOT public.is_admin() THEN
    IF v_stop.partner_user_id IS NULL OR v_stop.partner_user_id != auth.uid() THEN
      RAISE EXCEPTION 'Unauthorized: Caller is not the assigned partner with an accepted batch' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 3. Reject altering already completed stops
  IF v_stop.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Stop is already completed' USING ERRCODE = '22023';
  END IF;

  -- 4. Enforce Stop Dependencies: Drop-off cannot be completed before required pickups
  IF v_stop.type = 'DROPOFF' AND p_status = 'COMPLETED' THEN
    SELECT count(*)::int INTO v_pending_pickup_count
    FROM public.delivery_stops ps
    JOIN public.batch_orders bo ON ps.merchant_id = (
      SELECT merchant_id FROM public.merchant_suborders WHERE id = bo.suborder_id
    )
    WHERE ps.batch_id = v_stop.batch_id
      AND bo.order_id = v_stop.order_id
      AND ps.type = 'PICKUP'
      AND ps.status != 'COMPLETED';

    IF v_pending_pickup_count > 0 THEN
      RAISE EXCEPTION 'PRECONDITION_FAILED: Cannot complete drop-off before all merchant pickups for this order are completed' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- 5. Physical Proof of Delivery (POD) Verification for Drop-offs
  IF v_stop.type = 'DROPOFF' AND p_status = 'COMPLETED' THEN
    SELECT * INTO v_order FROM public.orders WHERE id = v_stop.order_id;

    IF v_order.pod_code IS NOT NULL AND v_order.pod_code != '' THEN
      IF v_order.pod_attempts >= 5 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'MAX_ATTEMPTS_EXCEEDED',
          'message', 'Maximum verification attempts exceeded (5/5). Contact dispatch.'
        );
      END IF;

      IF p_pod_code IS NULL OR trim(p_pod_code) = '' THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'MISSING_POD_CODE',
          'message', 'Customer verification code is required for drop-off'
        );
      END IF;

      IF trim(p_pod_code) != trim(v_order.pod_code) THEN
        UPDATE public.orders
        SET pod_attempts = pod_attempts + 1, updated_at = timezone('utc'::text, now())
        WHERE id = v_stop.order_id;

        INSERT INTO public.delivery_events (
          type, message, actor_id, order_id, batch_id, metadata
        ) VALUES (
          'DELIVERY_ATTEMPTED',
          'Invalid Proof of Delivery PIN entered (Attempt ' || (v_order.pod_attempts + 1) || ')',
          auth.uid(),
          v_stop.order_id,
          v_stop.batch_id,
          jsonb_build_object('stop_id', p_stop_id, 'attempt', v_order.pod_attempts + 1)
        );

        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_POD_CODE',
          'message', 'Incorrect Proof of Delivery PIN provided',
          'attempts', v_order.pod_attempts + 1
        );
      END IF;

      UPDATE public.orders
      SET pod_verified_at = timezone('utc'::text, now()),
          status = 'COMPLETED',
          updated_at = timezone('utc'::text, now())
      WHERE id = v_stop.order_id;
    ELSE
      UPDATE public.orders
      SET status = 'COMPLETED', updated_at = timezone('utc'::text, now())
      WHERE id = v_stop.order_id;
    END IF;

    INSERT INTO public.delivery_events (
      type, message, actor_id, order_id, batch_id, idempotency_key, metadata
    ) VALUES (
      'DELIVERED',
      'Drop-off verified and completed via Proof of Delivery code',
      auth.uid(),
      v_stop.order_id,
      v_stop.batch_id,
      p_idempotency_key,
      jsonb_build_object('stop_id', p_stop_id, 'verified', true)
    );
  END IF;

  -- 6. Update stop record
  UPDATE public.delivery_stops
  SET status = p_status,
      completed_at = CASE WHEN p_status IN ('COMPLETED', 'FAILED') THEN timezone('utc'::text, now()) ELSE completed_at END,
      arrived_at = CASE WHEN p_status = 'ARRIVED' THEN timezone('utc'::text, now()) ELSE arrived_at END,
      failure_reason = CASE WHEN p_status = 'FAILED' THEN p_failure_reason ELSE failure_reason END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_stop_id;

  -- 7. Handle failure state transitions
  IF p_status = 'FAILED' THEN
    IF v_stop.type = 'PICKUP' THEN
      UPDATE public.merchant_suborders
      SET status = 'CANCELLED',
          merchant_notes = COALESCE(merchant_notes, '') || ' [Pickup Failed: ' || COALESCE(p_failure_reason, 'Unspecified') || ']',
          updated_at = timezone('utc'::text, now())
      WHERE merchant_id = v_stop.merchant_id
        AND id IN (SELECT suborder_id FROM public.batch_orders WHERE batch_id = v_stop.batch_id);
    ELSIF v_stop.type = 'DROPOFF' THEN
      UPDATE public.orders
      SET customer_notes = COALESCE(customer_notes, '') || ' [Drop-off Attempt Failed: ' || COALESCE(p_failure_reason, 'Customer unavailable') || ']',
          updated_at = timezone('utc'::text, now())
      WHERE id = v_stop.order_id;
    END IF;

    INSERT INTO public.delivery_events (
      type, message, reason, actor_id, order_id, batch_id, idempotency_key
    ) VALUES (
      'FAILED',
      'Stop failed: ' || COALESCE(p_failure_reason, 'No reason specified'),
      p_failure_reason,
      auth.uid(),
      v_stop.order_id,
      v_stop.batch_id,
      p_idempotency_key
    );
  END IF;

  -- 8. Check if all stops in the batch are now completed
  SELECT count(*)::int INTO v_remaining_stops
  FROM public.delivery_stops
  WHERE batch_id = v_stop.batch_id AND status != 'COMPLETED';

  IF v_remaining_stops = 0 THEN
    UPDATE public.delivery_batches
    SET status = 'COMPLETED',
        completed_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_stop.batch_id;

    UPDATE public.delivery_assignments
    SET status = 'COMPLETED',
        completed_at = timezone('utc'::text, now())
    WHERE batch_id = v_stop.batch_id AND status = 'ACCEPTED';

    -- Automatically calculate and record partner settlement for completed batch
    PERFORM public.fn_calculate_partner_settlement(v_stop.batch_id);
  END IF;

  RETURN jsonb_build_object(
    'stop_id', p_stop_id,
    'status', p_status,
    'remaining_stops', v_remaining_stops
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_update_stop_status(UUID, stop_status, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_update_stop_status(UUID, stop_status, TEXT, TEXT, TEXT) TO authenticated;

-- Grant execution privileges on all functions to authenticated users
GRANT EXECUTE ON FUNCTION public.fn_calculate_partner_settlement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reassign_batch(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_handle_delivery_exception(UUID, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cancel_order(UUID, TEXT, TEXT) TO authenticated;

-- Seed Default Configurable Service Zones (Khammam, Warangal, Suryapet)
INSERT INTO public.service_zones (
  id,
  code,
  name,
  city,
  state,
  center_latitude,
  center_longitude,
  radius_km,
  operating_hours_start,
  operating_hours_end,
  is_active,
  max_batch_orders,
  max_batch_capacity,
  base_delivery_fee,
  per_km_fee,
  min_order_subtotal
)
VALUES 
  (
    'e0000000-0000-0000-0000-000000000001',
    'ZONE_KHAMMAM_CENTRAL',
    'Khammam Central Pilot Hub',
    'Khammam',
    'Telangana',
    17.2485,
    80.1530,
    12.0,
    '06:00:00',
    '23:00:00',
    true,
    4,
    10,
    35.00,
    10.00,
    50.00
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'ZONE_WARANGAL_URBAN',
    'Warangal Urban Expansion Zone',
    'Warangal',
    'Telangana',
    17.9689,
    79.5941,
    15.0,
    '07:00:00',
    '22:00:00',
    true,
    5,
    12,
    40.00,
    12.00,
    100.00
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'ZONE_SURYAPET_TOWN',
    'Suryapet Regional Hub',
    'Suryapet',
    'Telangana',
    17.1439,
    79.6239,
    10.0,
    '07:00:00',
    '21:30:00',
    true,
    3,
    8,
    30.00,
    8.00,
    50.00
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  center_latitude = EXCLUDED.center_latitude,
  center_longitude = EXCLUDED.center_longitude,
  operating_hours_start = EXCLUDED.operating_hours_start,
  operating_hours_end = EXCLUDED.operating_hours_end;

-- Seed Default Service Localities for Khammam
INSERT INTO public.service_localities (
  zone_id,
  name,
  code,
  latitude,
  longitude,
  is_active
)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Khammam Central', 'LOC_KHAMMAM_CENTRAL', 17.2485, 80.1530, true),
  ('e0000000-0000-0000-0000-000000000001', 'Wyra Road', 'LOC_WYRA_ROAD', 17.2475, 80.1518, true),
  ('e0000000-0000-0000-0000-000000000001', 'Mayuri Centre', 'LOC_MAYURI_CENTRE', 17.2450, 80.1480, true),
  ('e0000000-0000-0000-0000-000000000001', 'Station Road', 'LOC_STATION_ROAD', 17.2510, 80.1575, true),
  ('e0000000-0000-0000-0000-000000000001', 'Mamillagudem', 'LOC_MAMILLAGUDEM', 17.2600, 80.1600, true),
  ('e0000000-0000-0000-0000-000000000002', 'Hanamkonda Main', 'LOC_HANAMKONDA', 17.9950, 79.5600, true),
  ('e0000000-0000-0000-0000-000000000002', 'Kazipet Junction', 'LOC_KAZIPET', 17.9750, 79.5200, true),
  ('e0000000-0000-0000-0000-000000000003', 'Suryapet Bus Stand', 'LOC_SURYAPET_BUS_STAND', 17.1420, 79.6200, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active;
