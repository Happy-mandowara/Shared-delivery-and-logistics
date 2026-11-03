-- NationX Shared Delivery — Migration 05: POD Security, Stop Sequence & Failure Enforcement

-- 1. Add POD tracking columns to public.orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS pod_code TEXT,
  ADD COLUMN IF NOT EXISTS pod_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pod_verified_at TIMESTAMPTZ;

-- Add check constraint for pod_attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_pod_attempts'
  ) THEN
    ALTER TABLE public.orders 
      ADD CONSTRAINT chk_orders_pod_attempts CHECK (pod_attempts >= 0 AND pod_attempts <= 20);
  END IF;
END $$;

-- 2. Update existing deterministic seed orders with demo POD codes
UPDATE public.orders 
SET pod_code = '4829'
WHERE id = '30000000-0000-0000-0000-000000000001' AND (pod_code IS NULL OR pod_code = '');

UPDATE public.orders 
SET pod_code = '7193'
WHERE id = '30000000-0000-0000-0000-000000000002' AND (pod_code IS NULL OR pod_code = '');

UPDATE public.orders 
SET pod_code = '6381'
WHERE id = '30000000-0000-0000-0000-000000000003' AND (pod_code IS NULL OR pod_code = '');

-- 3. Hardened Stop Status Function with Sequence & POD Verification
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
    -- Check if any pickup stop for this order in the batch is not completed
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

    -- 5. Strict Server-Side POD Verification
    SELECT id, pod_code, pod_attempts, pod_verified_at, status
    INTO v_order
    FROM public.orders
    WHERE id = v_stop.order_id;

    IF v_order.pod_verified_at IS NOT NULL THEN
      RAISE EXCEPTION 'INVALID_STATE: Proof of delivery has already been verified for this order' USING ERRCODE = '22023';
    END IF;

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

    -- Compare supplied code against stored expected code
    IF trim(p_pod_code) != trim(COALESCE(v_order.pod_code, '')) THEN
      -- Increment failed attempt counter and persist to database
      UPDATE public.orders 
      SET pod_attempts = pod_attempts + 1,
          updated_at = timezone('utc'::text, now())
      WHERE id = v_stop.order_id;

      -- Log failed attempt event without leaking code
      INSERT INTO public.delivery_events (
        type, message, reason, actor_id, order_id, batch_id, metadata
      ) VALUES (
        'DELIVERY_ATTEMPTED',
        'Incorrect customer POD verification code entered',
        'ATTEMPT_' || (v_order.pod_attempts + 1),
        auth.uid(),
        v_stop.order_id,
        v_stop.batch_id,
        jsonb_build_object('stop_id', p_stop_id, 'attempt', v_order.pod_attempts + 1)
      );

      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_POD_CODE',
        'message', 'Incorrect verification code',
        'attempts', v_order.pod_attempts + 1
      );
    END IF;

    -- POD matches: mark verified
    UPDATE public.orders 
    SET pod_verified_at = timezone('utc'::text, now()),
        status = 'COMPLETED',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_stop.order_id;

    -- Update all suborders for this order in the batch to DELIVERED
    UPDATE public.merchant_suborders 
    SET status = 'DELIVERED', 
        updated_at = timezone('utc'::text, now())
    WHERE order_id = v_stop.order_id
      AND id IN (SELECT suborder_id FROM public.batch_orders WHERE batch_id = v_stop.batch_id);

    -- Log verified delivery event without leaking plaintext code
    INSERT INTO public.delivery_events (
      type, message, reason, actor_id, order_id, batch_id, idempotency_key, metadata
    ) VALUES (
      'DELIVERED',
      'Delivery completed to customer with verified POD',
      'VERIFIED_OTP',
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
      -- If merchant pickup fails, mark related suborders as EXCEPTION
      UPDATE public.merchant_suborders
      SET status = 'CANCELLED',
          merchant_notes = COALESCE(merchant_notes, '') || ' [Pickup Failed: ' || COALESCE(p_failure_reason, 'Unspecified') || ']',
          updated_at = timezone('utc'::text, now())
      WHERE merchant_id = v_stop.merchant_id
        AND id IN (SELECT suborder_id FROM public.batch_orders WHERE batch_id = v_stop.batch_id);
    ELSIF v_stop.type = 'DROPOFF' THEN
      -- If drop-off fails, do NOT complete the parent order
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
