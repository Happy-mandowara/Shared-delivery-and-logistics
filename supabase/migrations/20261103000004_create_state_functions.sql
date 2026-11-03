-- NationX Shared Delivery — Migration 04: Protected State Functions (SECURITY DEFINER)

-- 1. Merchant Accepts Suborder
CREATE OR REPLACE FUNCTION public.fn_accept_suborder(
  p_suborder_id UUID,
  p_prep_minutes INT,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
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
  v_deadline TIMESTAMPTZ;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.delivery_events WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('idempotent', true, 'suborder_id', p_suborder_id);
  END IF;

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

  IF v_current_status != 'PLACED' THEN
    RAISE EXCEPTION 'Cannot accept suborder in current status %', v_current_status USING ERRCODE = '22023';
  END IF;

  v_deadline := timezone('utc'::text, now()) + (COALESCE(p_prep_minutes, 30) || ' minutes')::interval;

  UPDATE public.merchant_suborders
  SET status = 'ACCEPTED',
      preparation_deadline = v_deadline,
      merchant_notes = COALESCE(p_notes, merchant_notes),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_suborder_id;

  INSERT INTO public.delivery_events (
    type, message, reason, actor_id, order_id, suborder_id, idempotency_key, metadata
  ) VALUES (
    'MERCHANT_ACCEPTED',
    'Merchant accepted suborder and committed preparation estimate',
    p_notes,
    auth.uid(),
    v_order_id,
    p_suborder_id,
    p_idempotency_key,
    jsonb_build_object('prep_minutes', p_prep_minutes, 'deadline', v_deadline)
  );

  RETURN jsonb_build_object(
    'suborder_id', p_suborder_id,
    'status', 'ACCEPTED',
    'preparation_deadline', v_deadline
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_accept_suborder(UUID, INT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_accept_suborder(UUID, INT, TEXT, TEXT) TO authenticated;

-- 2. Merchant Marks Suborder Ready
CREATE OR REPLACE FUNCTION public.fn_mark_suborder_ready(
  p_suborder_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
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
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.delivery_events WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('idempotent', true, 'suborder_id', p_suborder_id);
  END IF;

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

  IF v_current_status NOT IN ('ACCEPTED', 'PREPARING') THEN
    RAISE EXCEPTION 'Cannot mark ready from current status %', v_current_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.merchant_suborders
  SET status = 'READY_FOR_PICKUP',
      ready_at = timezone('utc'::text, now()),
      merchant_notes = COALESCE(p_notes, merchant_notes),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_suborder_id;

  INSERT INTO public.delivery_events (
    type, message, reason, actor_id, order_id, suborder_id, idempotency_key
  ) VALUES (
    'READY_FOR_PICKUP',
    'Merchant confirmed package is staged and ready for pickup',
    p_notes,
    auth.uid(),
    v_order_id,
    p_suborder_id,
    p_idempotency_key
  );

  RETURN jsonb_build_object(
    'suborder_id', p_suborder_id,
    'status', 'READY_FOR_PICKUP',
    'ready_at', timezone('utc'::text, now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_mark_suborder_ready(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_mark_suborder_ready(UUID, TEXT, TEXT) TO authenticated;

-- 3. Admin Creates Delivery Batch
CREATE OR REPLACE FUNCTION public.fn_create_batch(
  p_locality TEXT,
  p_max_orders INT,
  p_capacity_units INT,
  p_suborder_ids UUID[],
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_batch_id UUID;
  v_batch_code TEXT;
  v_suborder_id UUID;
  v_order_id UUID;
  v_seq INT := 1;
  v_sub RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can create shared batches' USING ERRCODE = '42501';
  END IF;

  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.delivery_events WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('idempotent', true);
  END IF;

  v_batch_code := 'BATCH-' || to_char(timezone('utc'::text, now()), 'YYYYMMDD-HH24MI') || '-' || substr(md5(random()::text), 1, 4);

  INSERT INTO public.delivery_batches (
    batch_code, status, locality, max_orders, capacity_units
  ) VALUES (
    v_batch_code, 'OPEN', p_locality, COALESCE(p_max_orders, 8), COALESCE(p_capacity_units, 10)
  ) RETURNING id INTO v_batch_id;

  -- Create pickup stops for distinct merchants in the batch
  FOR v_sub IN
    SELECT DISTINCT m.id AS merchant_id, m.address, m.locality, m.latitude, m.longitude
    FROM public.merchant_suborders ms
    JOIN public.merchants m ON ms.merchant_id = m.id
    WHERE ms.id = ANY(p_suborder_ids)
  LOOP
    INSERT INTO public.delivery_stops (
      batch_id, sequence, type, status, merchant_id, address, locality, latitude, longitude
    ) VALUES (
      v_batch_id, v_seq, 'PICKUP', 'PENDING', v_sub.merchant_id, v_sub.address, v_sub.locality, v_sub.latitude, v_sub.longitude
    );
    v_seq := v_seq + 1;
  END LOOP;

  -- Link suborders and create dropoff stops
  FOREACH v_suborder_id IN ARRAY p_suborder_ids
  LOOP
    SELECT order_id INTO v_order_id FROM public.merchant_suborders WHERE id = v_suborder_id;
    
    INSERT INTO public.batch_orders (batch_id, order_id, suborder_id)
    VALUES (v_batch_id, v_order_id, v_suborder_id)
    ON CONFLICT (batch_id, order_id, suborder_id) DO NOTHING;

    -- Create dropoff stop for customer order if not yet created for this batch
    IF NOT EXISTS (
      SELECT 1 FROM public.delivery_stops WHERE batch_id = v_batch_id AND order_id = v_order_id AND type = 'DROPOFF'
    ) THEN
      SELECT o.delivery_address, o.delivery_locality, o.delivery_latitude, o.delivery_longitude
      INTO v_sub
      FROM public.orders o WHERE o.id = v_order_id;

      INSERT INTO public.delivery_stops (
        batch_id, sequence, type, status, order_id, suborder_id, address, locality, latitude, longitude
      ) VALUES (
        v_batch_id, v_seq, 'DROPOFF', 'PENDING', v_order_id, v_suborder_id, v_sub.delivery_address, v_sub.delivery_locality, v_sub.delivery_latitude, v_sub.delivery_longitude
      );
      v_seq := v_seq + 1;
    END IF;
  END LOOP;

  -- Log event
  INSERT INTO public.delivery_events (
    type, message, actor_id, batch_id, idempotency_key, metadata
  ) VALUES (
    'ORDER_REQUESTED',
    'Created coordinated delivery batch ' || v_batch_code,
    auth.uid(),
    v_batch_id,
    p_idempotency_key,
    jsonb_build_object('suborders', p_suborder_ids, 'total_stops', v_seq - 1)
  );

  RETURN jsonb_build_object(
    'batch_id', v_batch_id,
    'batch_code', v_batch_code,
    'status', 'OPEN',
    'total_stops', v_seq - 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_create_batch(TEXT, INT, INT, UUID[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_batch(TEXT, INT, INT, UUID[], TEXT) TO authenticated;

-- 4. Admin Assigns Partner to Batch
CREATE OR REPLACE FUNCTION public.fn_assign_batch(
  p_batch_id UUID,
  p_partner_id UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_assignment_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can assign batches' USING ERRCODE = '42501';
  END IF;

  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.delivery_assignments WHERE idempotency_key = p_idempotency_key
  ) THEN
    SELECT id INTO v_assignment_id FROM public.delivery_assignments WHERE idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object('idempotent', true, 'assignment_id', v_assignment_id);
  END IF;

  INSERT INTO public.delivery_assignments (
    batch_id, partner_id, status, idempotency_key
  ) VALUES (
    p_batch_id, p_partner_id, 'OFFERED', p_idempotency_key
  ) RETURNING id INTO v_assignment_id;

  UPDATE public.delivery_batches
  SET status = 'ASSIGNED',
      updated_at = timezone('utc'::text, now())
  WHERE id = p_batch_id;

  INSERT INTO public.delivery_events (
    type, message, actor_id, batch_id, idempotency_key
  ) VALUES (
    'PARTNER_ASSIGNED',
    'Batch offered to delivery partner',
    auth.uid(),
    p_batch_id,
    p_idempotency_key
  );

  RETURN jsonb_build_object(
    'assignment_id', v_assignment_id,
    'batch_id', p_batch_id,
    'partner_id', p_partner_id,
    'status', 'OFFERED'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_assign_batch(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_assign_batch(UUID, UUID, TEXT) TO authenticated;

-- 5. Partner Responds to Assignment
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
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.delivery_events WHERE idempotency_key = p_idempotency_key
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
    v_new_batch_status := 'OPEN';
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

-- 6. Merchant/Partner Handover Confirmation
CREATE OR REPLACE FUNCTION public.fn_confirm_handover(
  p_suborder_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_merchant_user_id UUID;
  v_order_id UUID;
  v_batch_id UUID;
  v_current_status suborder_status;
BEGIN
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.delivery_events WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('idempotent', true, 'suborder_id', p_suborder_id);
  END IF;

  SELECT m.user_id, ms.status, ms.order_id
  INTO v_merchant_user_id, v_current_status, v_order_id
  FROM public.merchant_suborders ms
  JOIN public.merchants m ON ms.merchant_id = m.id
  WHERE ms.id = p_suborder_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suborder % not found', p_suborder_id USING ERRCODE = 'P0002';
  END IF;

  IF v_merchant_user_id != auth.uid() AND NOT public.is_admin() THEN
    -- Check if caller is assigned partner
    SELECT bo.batch_id INTO v_batch_id
    FROM public.batch_orders bo
    JOIN public.delivery_assignments da ON bo.batch_id = da.batch_id
    JOIN public.delivery_partners dp ON da.partner_id = dp.id
    WHERE bo.suborder_id = p_suborder_id AND dp.user_id = auth.uid() AND da.status = 'ACCEPTED';

    IF v_batch_id IS NULL THEN
      RAISE EXCEPTION 'Unauthorized: Caller is neither merchant owner nor assigned partner' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.merchant_suborders
  SET status = 'PICKED_UP',
      handed_over_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_suborder_id;

  -- Update associated pickup stop if present
  UPDATE public.delivery_stops
  SET status = 'COMPLETED',
      completed_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE (suborder_id = p_suborder_id OR merchant_id IN (SELECT merchant_id FROM public.merchant_suborders WHERE id = p_suborder_id))
    AND type = 'PICKUP' AND status != 'COMPLETED';

  -- Update batch to IN_PROGRESS if in ACCEPTED
  UPDATE public.delivery_batches
  SET status = 'IN_PROGRESS',
      dispatched_at = COALESCE(dispatched_at, timezone('utc'::text, now())),
      updated_at = timezone('utc'::text, now())
  WHERE id IN (SELECT batch_id FROM public.batch_orders WHERE suborder_id = p_suborder_id)
    AND status = 'ACCEPTED';

  INSERT INTO public.delivery_events (
    type, message, reason, actor_id, order_id, suborder_id, idempotency_key
  ) VALUES (
    'PICKUP_CONFIRMED',
    'Merchant handover confirmed and suborder picked up',
    p_notes,
    auth.uid(),
    v_order_id,
    p_suborder_id,
    p_idempotency_key
  );

  RETURN jsonb_build_object(
    'suborder_id', p_suborder_id,
    'status', 'PICKED_UP',
    'handed_over_at', timezone('utc'::text, now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_confirm_handover(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_confirm_handover(UUID, TEXT, TEXT) TO authenticated;

-- 7. Partner Updates Stop Status (Drop-off & Proof of Delivery)
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
  v_partner_user_id UUID;
  v_remaining_stops INT;
BEGIN
  IF p_idempotency_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.delivery_events WHERE idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object('idempotent', true, 'stop_id', p_stop_id);
  END IF;

  SELECT ds.*, dp.user_id AS partner_user_id
  INTO v_stop
  FROM public.delivery_stops ds
  LEFT JOIN public.delivery_assignments da ON ds.batch_id = da.batch_id AND da.status = 'ACCEPTED'
  LEFT JOIN public.delivery_partners dp ON da.partner_id = dp.id
  WHERE ds.id = p_stop_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stop % not found', p_stop_id USING ERRCODE = 'P0002';
  END IF;

  IF v_stop.partner_user_id != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not the assigned partner' USING ERRCODE = '42501';
  END IF;

  UPDATE public.delivery_stops
  SET status = p_status,
      completed_at = CASE WHEN p_status IN ('COMPLETED', 'FAILED') THEN timezone('utc'::text, now()) ELSE completed_at END,
      arrived_at = CASE WHEN p_status = 'ARRIVED' THEN timezone('utc'::text, now()) ELSE arrived_at END,
      failure_reason = p_failure_reason,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_stop_id;

  -- If customer drop-off is completed:
  IF v_stop.type = 'DROPOFF' AND p_status = 'COMPLETED' THEN
    -- Update suborder and order status
    IF v_stop.suborder_id IS NOT NULL THEN
      UPDATE public.merchant_suborders SET status = 'DELIVERED', updated_at = timezone('utc'::text, now()) WHERE id = v_stop.suborder_id;
    END IF;

    IF v_stop.order_id IS NOT NULL THEN
      UPDATE public.orders SET status = 'COMPLETED', updated_at = timezone('utc'::text, now()) WHERE id = v_stop.order_id;
    END IF;

    INSERT INTO public.delivery_events (
      type, message, reason, actor_id, order_id, suborder_id, batch_id, idempotency_key, metadata
    ) VALUES (
      'DELIVERED',
      'Delivery completed to customer with POD confirmation',
      p_pod_code,
      auth.uid(),
      v_stop.order_id,
      v_stop.suborder_id,
      v_stop.batch_id,
      p_idempotency_key,
      jsonb_build_object('pod_code', p_pod_code, 'stop_id', p_stop_id)
    );
  ELSIF p_status = 'FAILED' THEN
    INSERT INTO public.delivery_events (
      type, message, reason, actor_id, order_id, suborder_id, batch_id, idempotency_key
    ) VALUES (
      'FAILED',
      'Stop failed: ' || COALESCE(p_failure_reason, 'No reason specified'),
      p_failure_reason,
      auth.uid(),
      v_stop.order_id,
      v_stop.suborder_id,
      v_stop.batch_id,
      p_idempotency_key
    );
  END IF;

  -- Check if all stops in the batch are now completed
  SELECT count(*) INTO v_remaining_stops
  FROM public.delivery_stops
  WHERE batch_id = v_stop.batch_id AND status NOT IN ('COMPLETED', 'SKIPPED');

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

