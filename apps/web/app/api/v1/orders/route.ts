import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { CreateOrderInputSchema, UserRole, calculateDemoDeliveryFee } from "@nationx/shared";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.CUSTOMER, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;

  try {
    const orders = await withUserDb(user.id, async (client) => {
      const ordersRes = await client.query(
        `SELECT id, order_number AS "orderNumber", customer_id AS "customerId", status,
                fulfillment_mode AS "fulfillmentMode", delivery_address AS "deliveryAddress",
                delivery_locality AS "deliveryLocality", delivery_latitude AS "deliveryLatitude",
                delivery_longitude AS "deliveryLongitude", delivery_window_start AS "deliveryWindowStart",
                delivery_window_end AS "deliveryWindowEnd", subtotal, delivery_fee AS "deliveryFee",
                total, customer_notes AS "customerNotes", pod_code AS "podCode",
                pod_verified_at AS "podVerifiedAt", created_at AS "createdAt"
         FROM public.orders
         ORDER BY created_at DESC`
      );

      return ordersRes.rows;
    });

    return apiSuccess(orders);
  } catch (err: any) {
    return apiError("DATABASE_ERROR", err.message || "Failed to fetch orders", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.CUSTOMER, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;

  try {
    const body = await req.json();
    const parsed = CreateOrderInputSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid order payload", 400, parsed.error.format());
    }

    const input = parsed.data;

    // Customer can only create orders for themselves; admin can create for any customer
    const targetCustomerId = user.role === UserRole.ADMIN ? input.customerId : user.id;

    const result = await withUserDb(user.id, async (client) => {
      // 0. Idempotency Check
      if (input.idempotencyKey) {
        const existingEvent = await client.query(
          `SELECT order_id FROM public.delivery_events WHERE idempotency_key = $1 LIMIT 1`,
          [input.idempotencyKey]
        );
        if (existingEvent.rows.length > 0 && existingEvent.rows[0].order_id) {
          const existingOrder = await client.query(
            `SELECT id, order_number AS "orderNumber", status, subtotal, delivery_fee AS "deliveryFee", total, pod_code AS "podCode"
             FROM public.orders WHERE id = $1`,
            [existingEvent.rows[0].order_id]
          );
          if (existingOrder.rows.length > 0) {
            return { ...existingOrder.rows[0], idempotent: true };
          }
        }
      }

      // 1. Authoritative Server-Side Product Validation and Pricing
      let orderSubtotal = 0;
      let totalItemCount = 0;
      const validatedSuborders: any[] = [];

      for (const suborder of input.suborders) {
        let subtotal = 0;
        const validatedItems: any[] = [];

        for (const item of suborder.items) {
          let unitPrice = item.unitPrice;
          let productName = item.productName;
          let handlingTag = item.handlingTag || "STANDARD";

          // If productId is provided, or if matching product found by name for this merchant
          let productQuery: any = null;
          if (item.productId) {
            productQuery = await client.query(
              `SELECT id, merchant_id, name, price, stock_status, is_active, handling_tag
               FROM public.products
               WHERE id = $1`,
              [item.productId]
            );
          } else {
            productQuery = await client.query(
              `SELECT id, merchant_id, name, price, stock_status, is_active, handling_tag
               FROM public.products
               WHERE merchant_id = $1 AND LOWER(name) = LOWER($2)
               LIMIT 1`,
              [suborder.merchantId, item.productName]
            );
          }

          if (productQuery && productQuery.rows.length > 0) {
            const product = productQuery.rows[0];

            if (product.merchant_id !== suborder.merchantId) {
              throw new Error(`PRODUCT_MERCHANT_MISMATCH: Product ${product.name} does not belong to the specified merchant`);
            }
            if (!product.is_active) {
              throw new Error(`PRODUCT_INACTIVE: Product ${product.name} is currently inactive and cannot be ordered`);
            }
            if (product.stock_status === "OUT_OF_STOCK") {
              throw new Error(`PRODUCT_OUT_OF_STOCK: Product ${product.name} is currently out of stock`);
            }

            // Authoritatively use database price
            unitPrice = parseFloat(product.price);
            productName = product.name;
            handlingTag = product.handling_tag || handlingTag;
          }

          const lineTotal = item.quantity * unitPrice;
          subtotal += lineTotal;
          totalItemCount += item.quantity;

          validatedItems.push({
            productId: item.productId || null,
            productName,
            sku: item.sku || null,
            quantity: item.quantity,
            unitPrice,
            handlingTag,
            weightUnits: item.weightUnits || null,
          });
        }

        orderSubtotal += subtotal;
        validatedSuborders.push({
          merchantId: suborder.merchantId,
          subtotal,
          items: validatedItems,
        });
      }

      // 2. Authoritative Delivery fee calculation
      const feeInfo = calculateDemoDeliveryFee(2.5, totalItemCount);
      const deliveryFee = feeInfo.amount;
      const totalAmount = orderSubtotal + deliveryFee;

      // 3. Generate unique order number and random 4-digit verification code
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `ORD-${datePart}-${randomSuffix}`;
      const podCode = Math.floor(1000 + Math.random() * 9000).toString();

      // 4. Insert parent order
      const orderInsert = await client.query(
        `INSERT INTO public.orders (
          order_number, customer_id, status, fulfillment_mode, delivery_address,
          delivery_locality, delivery_latitude, delivery_longitude,
          delivery_window_start, delivery_window_end, customer_notes,
          payment_reference, subtotal, delivery_fee, total, pod_code
        ) VALUES ($1, $2, 'CONFIRMED', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id`,
        [
          orderNumber,
          targetCustomerId,
          input.fulfillmentMode,
          input.deliveryAddress,
          input.deliveryLocality,
          input.deliveryLatitude || null,
          input.deliveryLongitude || null,
          input.deliveryWindowStart || null,
          input.deliveryWindowEnd || null,
          input.customerNotes || null,
          input.paymentReference || null,
          orderSubtotal,
          deliveryFee,
          totalAmount,
          podCode,
        ]
      );

      const orderId = orderInsert.rows[0].id;

      // 5. Insert delivery fee reference
      await client.query(
        `INSERT INTO public.delivery_fees (order_id, amount, currency, rule_code, is_demo_rule)
         VALUES ($1, $2, 'INR', $3, true)`,
        [orderId, deliveryFee, feeInfo.ruleCode]
      );

      // 6. Insert suborders and items
      const createdSuborders = [];
      let subIndex = 1;

      for (const suborder of validatedSuborders) {
        const suborderNumber = `SUB-${orderNumber.slice(-4)}-${String.fromCharCode(64 + subIndex)}`;

        const subInsert = await client.query(
          `INSERT INTO public.merchant_suborders (
            suborder_number, order_id, merchant_id, status, subtotal
          ) VALUES ($1, $2, $3, 'PLACED', $4)
          RETURNING id`,
          [suborderNumber, orderId, suborder.merchantId, suborder.subtotal]
        );

        const suborderId = subInsert.rows[0].id;

        for (const item of suborder.items) {
          await client.query(
            `INSERT INTO public.order_items (
              suborder_id, product_name, sku, quantity, unit_price, handling_tag, weight_units
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              suborderId,
              item.productName,
              item.sku || null,
              item.quantity,
              item.unitPrice,
              item.handlingTag || null,
              item.weightUnits || null,
            ]
          );
        }

        createdSuborders.push({
          id: suborderId,
          suborderNumber,
          merchantId: suborder.merchantId,
          subtotal: suborder.subtotal,
        });

        subIndex++;
      }

      // 7. Audit log event (triggers notification generation via trg_delivery_events_notify)
      await client.query(
        `INSERT INTO public.delivery_events (type, message, actor_id, order_id, idempotency_key)
         VALUES ('ORDER_REQUESTED', $1, $2, $3, $4)`,
        [`Customer confirmed order ${orderNumber}`, user.id, orderId, input.idempotencyKey || null]
      );

      return {
        id: orderId,
        orderNumber,
        customerId: targetCustomerId,
        status: "CONFIRMED",
        subtotal: orderSubtotal,
        deliveryFee,
        total: totalAmount,
        podCode,
        suborders: createdSuborders,
      };
    });

    return apiSuccess(result, (result as any)?.idempotent ? 200 : 201);
  } catch (err: any) {
    if (err.message.includes("PRODUCT_OUT_OF_STOCK")) {
      return apiError("PRODUCT_OUT_OF_STOCK", err.message, 400);
    }
    if (err.message.includes("PRODUCT_INACTIVE")) {
      return apiError("PRODUCT_INACTIVE", err.message, 400);
    }
    if (err.message.includes("PRODUCT_MERCHANT_MISMATCH")) {
      return apiError("PRODUCT_MERCHANT_MISMATCH", err.message, 400);
    }
    return apiError("ORDER_CREATION_FAILED", err.message || "Failed to create order", 500);
  }
}

