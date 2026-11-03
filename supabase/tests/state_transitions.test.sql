-- NationX Shared Delivery — Test Suite 2: State Transitions & Idempotency Verification

BEGIN;

SET LOCAL ROLE authenticated;

-- Step 1: Merchant 1 Accepts Suborder SUB-001-A
SET LOCAL "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  v_res JSONB;
  v_dup JSONB;
  v_event_count INT;
BEGIN
  v_res := public.fn_accept_suborder(
    '40000000-0000-0000-0000-000000000001',
    25,
    'Freshly cooked biryani prep starting',
    'IDEM-ACCEPT-001'
  );

  IF (v_res->>'status') != 'ACCEPTED' THEN
    RAISE EXCEPTION 'Transition FAIL: Expected ACCEPTED, got %', (v_res->>'status');
  END IF;

  -- Test Idempotency: Duplicate call with identical key
  v_dup := public.fn_accept_suborder(
    '40000000-0000-0000-0000-000000000001',
    25,
    'Freshly cooked biryani prep starting',
    'IDEM-ACCEPT-001'
  );

  IF (v_dup->>'idempotent') != 'true' THEN
    RAISE EXCEPTION 'Idempotency FAIL: Expected idempotent=true';
  END IF;

  -- Verify exactly 1 event was logged
  SELECT count(*) INTO v_event_count
  FROM public.delivery_events
  WHERE idempotency_key = 'IDEM-ACCEPT-001';

  IF v_event_count != 1 THEN
    RAISE EXCEPTION 'Idempotency FAIL: Created % events instead of 1', v_event_count;
  END IF;

  RAISE NOTICE 'TEST PASS: fn_accept_suborder and idempotency verified.';
END $$;

-- Step 2: Merchant 1 Marks Suborder Ready
DO $$
DECLARE
  v_res JSONB;
BEGIN
  v_res := public.fn_mark_suborder_ready(
    '40000000-0000-0000-0000-000000000001',
    'Biryani packed in insulated hot-bag',
    'IDEM-READY-001'
  );

  IF (v_res->>'status') != 'READY_FOR_PICKUP' THEN
    RAISE EXCEPTION 'Transition FAIL: Expected READY_FOR_PICKUP, got %', (v_res->>'status');
  END IF;

  RAISE NOTICE 'TEST PASS: fn_mark_suborder_ready verified.';
END $$;

-- Step 3: Admin Forms Shared Batch for Compatible Suborders
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  v_res JSONB;
  v_batch_id UUID;
  v_stop_count INT;
BEGIN
  v_res := public.fn_create_batch(
    'Khammam Central',
    8,
    10,
    ARRAY['40000000-0000-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000002'::uuid, '40000000-0000-0000-0000-000000000003'::uuid],
    'IDEM-BATCH-001'
  );

  v_batch_id := (v_res->>'batch_id')::uuid;

  IF (v_res->>'status') != 'OPEN' THEN
    RAISE EXCEPTION 'Batch FAIL: Expected status OPEN, got %', (v_res->>'status');
  END IF;

  SELECT count(*) INTO v_stop_count FROM public.delivery_stops WHERE batch_id = v_batch_id;
  IF v_stop_count < 2 THEN
    RAISE EXCEPTION 'Batch FAIL: Expected >= 2 stops, got %', v_stop_count;
  END IF;

  RAISE NOTICE 'TEST PASS: fn_create_batch verified with % stops.', v_stop_count;
END $$;

-- Step 4: Admin Assigns Batch to Partner 1
DO $$
DECLARE
  v_batch_id UUID;
  v_partner_id UUID := '20000000-0000-0000-0000-000000000001';
  v_res JSONB;
  v_assign_id UUID;
BEGIN
  SELECT id INTO v_batch_id FROM public.delivery_batches LIMIT 1;

  v_res := public.fn_assign_batch(
    v_batch_id,
    v_partner_id,
    'IDEM-ASSIGN-001'
  );

  v_assign_id := (v_res->>'assignment_id')::uuid;

  IF (v_res->>'status') != 'OFFERED' THEN
    RAISE EXCEPTION 'Assignment FAIL: Expected OFFERED, got %', (v_res->>'status');
  END IF;

  RAISE NOTICE 'TEST PASS: fn_assign_batch verified.';
END $$;

-- Step 5: Partner 1 Accepts Assignment
SET LOCAL "request.jwt.claim.sub" = 'c0000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  v_assign_id UUID;
  v_res JSONB;
BEGIN
  SELECT id INTO v_assign_id FROM public.delivery_assignments WHERE status = 'OFFERED' LIMIT 1;

  v_res := public.fn_respond_assignment(
    v_assign_id,
    true,
    'Partner accepted shared route on Splendor',
    'IDEM-RESPOND-001'
  );

  IF (v_res->>'status') != 'ACCEPTED' THEN
    RAISE EXCEPTION 'Acceptance FAIL: Expected ACCEPTED, got %', (v_res->>'status');
  END IF;

  RAISE NOTICE 'TEST PASS: fn_respond_assignment verified.';
END $$;

-- Step 6: Handover Confirmation
-- First, mark Suborder 2 ready as Merchant 3 (Sri Krishna Sweets owner)
SET LOCAL "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000003';

DO $$
DECLARE
  v_res JSONB;
BEGIN
  -- Accept and ready Suborder 2 (Sri Krishna Sweets for Order 1)
  v_res := public.fn_accept_suborder('40000000-0000-0000-0000-000000000002', 20, 'IDEM-ACCEPT-002');
  v_res := public.fn_mark_suborder_ready('40000000-0000-0000-0000-000000000002', 'Sweets packed', 'IDEM-READY-002');
END $$;

-- Switch caller back to Partner 1
SET LOCAL "request.jwt.claim.sub" = 'c0000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  v_res JSONB;
BEGIN
  -- Pick up Suborder 1 (Bawarchi)
  v_res := public.fn_confirm_handover(
    '40000000-0000-0000-0000-000000000001',
    'Picked up from Bawarchi counter',
    'IDEM-PICKUP-001'
  );

  IF (v_res->>'status') != 'PICKED_UP' THEN
    RAISE EXCEPTION 'Handover FAIL: Expected PICKED_UP, got %', (v_res->>'status');
  END IF;

  RAISE NOTICE 'TEST PASS: fn_confirm_handover for suborder 1 verified.';
END $$;

-- Step 6b: Verify Premature Drop-off is REJECTED (Suborder 2 pickup is still pending)
DO $$
DECLARE
  v_stop_id UUID;
  v_failed BOOLEAN := FALSE;
BEGIN
  -- Order 1 drop-off stop
  SELECT id INTO v_stop_id FROM public.delivery_stops WHERE type = 'DROPOFF' AND order_id = '30000000-0000-0000-0000-000000000001';

  BEGIN
    PERFORM public.fn_update_stop_status(
      v_stop_id,
      'COMPLETED',
      NULL,
      '4829',
      'IDEM-STOP-DROP-PREMATURE'
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Cannot complete drop-off before all merchant pickups%' THEN
      v_failed := TRUE;
    ELSE
      RAISE EXCEPTION 'Unexpected error: %', SQLERRM;
    END IF;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'Security FAIL: Premature dropoff was not blocked!';
  END IF;

  RAISE NOTICE 'TEST PASS: Premature dropoff successfully blocked by precondition check.';
END $$;

-- Step 6c: Pick up Suborder 2 so Order 1 is fully in transit
DO $$
DECLARE
  v_res JSONB;
BEGIN
  v_res := public.fn_confirm_handover(
    '40000000-0000-0000-0000-000000000002',
    'Picked up from Balaji Sweets',
    'IDEM-PICKUP-002'
  );
  IF (v_res->>'status') != 'PICKED_UP' THEN
    RAISE EXCEPTION 'Handover FAIL: Expected PICKED_UP, got %', (v_res->>'status');
  END IF;
  RAISE NOTICE 'TEST PASS: fn_confirm_handover for suborder 2 verified.';
END $$;

-- Step 7: Complete Drop-off Stop with Proof of Delivery
DO $$
DECLARE
  v_stop_id UUID;
  v_res JSONB;
BEGIN
  SELECT id INTO v_stop_id FROM public.delivery_stops WHERE type = 'DROPOFF' AND order_id = '30000000-0000-0000-0000-000000000001';

  -- Attempt with wrong POD code first (returns structured error)
  v_res := public.fn_update_stop_status(
    v_stop_id,
    'COMPLETED',
    NULL,
    '0000',
    'IDEM-STOP-DROP-WRONG-POD'
  );

  IF (v_res->>'error_code') != 'INVALID_POD_CODE' THEN
    RAISE EXCEPTION 'Security FAIL: Expected INVALID_POD_CODE, got %', v_res;
  END IF;

  -- Complete with valid POD code '4829'
  v_res := public.fn_update_stop_status(
    v_stop_id,
    'COMPLETED',
    NULL,
    '4829',
    'IDEM-STOP-DROP-001'
  );

  IF (v_res->>'status') != 'COMPLETED' THEN
    RAISE EXCEPTION 'Stop status FAIL: Expected COMPLETED, got %', (v_res->>'status');
  END IF;

  RAISE NOTICE 'TEST PASS: fn_update_stop_status and POD completion verified.';
END $$;

ROLLBACK;

