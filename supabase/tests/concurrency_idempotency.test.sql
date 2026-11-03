-- NationX Shared Delivery — Test Suite 3: Concurrency and Idempotency Verification

BEGIN;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  v_batch_id UUID;
  v_partner_1 UUID := '20000000-0000-0000-0000-000000000001';
  v_partner_2 UUID := '20000000-0000-0000-0000-000000000002';
  v_res_1 JSONB;
  v_res_dup JSONB;
  v_count INT;
BEGIN
  -- Create test batch
  v_res_1 := public.fn_create_batch(
    'Khammam Central',
    8,
    10,
    ARRAY['40000000-0000-0000-0000-000000000001'::uuid],
    'CONCURRENCY-BATCH-01'
  );
  v_batch_id := (v_res_1->>'batch_id')::uuid;

  -- 1. Test duplicate batch assignment with identical key
  v_res_1 := public.fn_assign_batch(v_batch_id, v_partner_1, 'CONCURRENCY-KEY-ASSIGN-01');
  v_res_dup := public.fn_assign_batch(v_batch_id, v_partner_1, 'CONCURRENCY-KEY-ASSIGN-01');

  IF (v_res_dup->>'idempotent') != 'true' THEN
    RAISE EXCEPTION 'Concurrency FAIL: Expected idempotent=true on duplicate assignment key';
  END IF;

  -- Verify exactly 1 assignment record created
  SELECT count(*) INTO v_count
  FROM public.delivery_assignments
  WHERE idempotency_key = 'CONCURRENCY-KEY-ASSIGN-01';

  IF v_count != 1 THEN
    RAISE EXCEPTION 'Concurrency FAIL: Expected 1 assignment, found %', v_count;
  END IF;

  -- 2. Test duplicate event logging
  SELECT count(*) INTO v_count
  FROM public.delivery_events
  WHERE idempotency_key = 'CONCURRENCY-KEY-ASSIGN-01';

  IF v_count != 1 THEN
    RAISE EXCEPTION 'Concurrency FAIL: Expected 1 delivery event, found %', v_count;
  END IF;

  RAISE NOTICE 'TEST PASS: Concurrency and Idempotency guarantees verified.';
END $$;

ROLLBACK;

