-- NationX Shared Delivery — Test Suite 1: RLS Data Isolation & Permissions Verification

BEGIN;

-- 1. Test as Customer 1 (Rajesh)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'd0000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  v_order_count INT;
  v_other_order_count INT;
  v_suborder_count INT;
BEGIN
  -- Customer 1 must see exactly 1 order (their own)
  SELECT count(*) INTO v_order_count FROM public.orders;
  IF v_order_count != 1 THEN
    RAISE EXCEPTION 'RLS FAIL: Customer 1 saw % orders instead of 1', v_order_count;
  END IF;

  -- Customer 1 must NOT see Customer 2's order
  SELECT count(*) INTO v_other_order_count
  FROM public.orders WHERE customer_id = 'd0000000-0000-0000-0000-000000000002';
  IF v_other_order_count != 0 THEN
    RAISE EXCEPTION 'RLS FAIL: Customer 1 saw Customer 2 order! PII LEAK!';
  END IF;

  -- Customer 1 must see only the 2 suborders for their own order (SUB-001-A, SUB-001-B)
  SELECT count(*) INTO v_suborder_count FROM public.merchant_suborders;
  IF v_suborder_count != 2 THEN
    RAISE EXCEPTION 'RLS FAIL: Customer 1 saw % suborders instead of 2', v_suborder_count;
  END IF;

  RAISE NOTICE 'TEST PASS: Customer 1 data isolation verified.';
END $$;

-- 2. Test as Merchant 1 (Bawarchi Biryani Manager)
SET LOCAL "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  v_suborder_count INT;
  v_other_shop_suborders INT;
BEGIN
  -- Merchant 1 must see exactly 2 suborders (SUB-001-A and SUB-003-A from their shop)
  SELECT count(*) INTO v_suborder_count FROM public.merchant_suborders;
  IF v_suborder_count != 2 THEN
    RAISE EXCEPTION 'RLS FAIL: Merchant 1 saw % suborders instead of 2', v_suborder_count;
  END IF;

  -- Merchant 1 must NOT see Balaji Kirana suborders
  SELECT count(*) INTO v_other_shop_suborders
  FROM public.merchant_suborders
  WHERE merchant_id = '10000000-0000-0000-0000-000000000002';
  IF v_other_shop_suborders != 0 THEN
    RAISE EXCEPTION 'RLS FAIL: Merchant 1 saw another shop suborders!';
  END IF;

  RAISE NOTICE 'TEST PASS: Merchant 1 shop isolation verified.';
END $$;

-- 3. Test as Delivery Partner 1 (Suresh Rider)
SET LOCAL "request.jwt.claim.sub" = 'c0000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  v_assignment_count INT;
  v_batch_count INT;
BEGIN
  -- Partner 1 has no offered batches yet
  SELECT count(*) INTO v_assignment_count FROM public.delivery_assignments;
  IF v_assignment_count != 0 THEN
    RAISE EXCEPTION 'RLS FAIL: Partner 1 saw unexpected assignments: %', v_assignment_count;
  END IF;

  -- Partner 1 cannot see unassigned batches
  SELECT count(*) INTO v_batch_count FROM public.delivery_batches;
  IF v_batch_count != 0 THEN
    RAISE EXCEPTION 'RLS FAIL: Partner 1 saw unassigned batches: %', v_batch_count;
  END IF;

  RAISE NOTICE 'TEST PASS: Partner 1 assignment scoping verified.';
END $$;

-- 4. Test as Central Dispatch Operations Admin
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  v_all_orders INT;
  v_all_suborders INT;
  v_all_merchants INT;
BEGIN
  -- Admin sees all 3 orders
  SELECT count(*) INTO v_all_orders FROM public.orders;
  IF v_all_orders != 3 THEN
    RAISE EXCEPTION 'RLS FAIL: Admin saw % orders instead of 3', v_all_orders;
  END IF;

  -- Admin sees all 4 suborders
  SELECT count(*) INTO v_all_suborders FROM public.merchant_suborders;
  IF v_all_suborders != 4 THEN
    RAISE EXCEPTION 'RLS FAIL: Admin saw % suborders instead of 4', v_all_suborders;
  END IF;

  -- Admin sees all active merchants (at least 3 baseline)
  SELECT count(*) INTO v_all_merchants FROM public.merchants;
  IF v_all_merchants < 3 THEN
    RAISE EXCEPTION 'RLS FAIL: Admin saw % merchants, expected at least 3', v_all_merchants;
  END IF;

  RAISE NOTICE 'TEST PASS: Administrator operational visibility verified.';
END $$;

ROLLBACK;

