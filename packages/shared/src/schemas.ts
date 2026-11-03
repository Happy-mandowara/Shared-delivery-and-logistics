import { z } from "zod";
import {
  UserRole,
  FulfillmentMode,
  OrderStatus,
  SuborderStatus,
  BatchStatus,
  AssignmentStatus,
  PartnerAvailability,
  StopType,
  StopStatus,
  DeliveryEventType,
  HandlingTag,
  StockStatus,
  NotificationType,
} from "./enums";

export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean(),
});

export const CreateOrderInputSchema = z.object({
  customerId: z.string().uuid(),
  fulfillmentMode: z.nativeEnum(FulfillmentMode).default(FulfillmentMode.SHARED_DELIVERY),
  deliveryAddress: z.string().min(5),
  deliveryLocality: z.string().min(2),
  deliveryLatitude: z.number().min(-90).max(90).optional().nullable(),
  deliveryLongitude: z.number().min(-180).max(180).optional().nullable(),
  deliveryWindowStart: z.string().datetime().optional().nullable(),
  deliveryWindowEnd: z.string().datetime().optional().nullable(),
  customerNotes: z.string().max(500).optional().nullable(),
  paymentReference: z.string().optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
  suborders: z.array(
    z.object({
      merchantId: z.string().uuid(),
      items: z.array(
        z.object({
          productId: z.string().uuid().optional(),
          productName: z.string().min(1),
          sku: z.string().optional().nullable(),
          quantity: z.number().int().positive(),
          unitPrice: z.number().nonnegative(),
          handlingTag: z.string().optional().nullable(),
          weightUnits: z.number().positive().optional().nullable(),
        })
      ).min(1),
    })
  ).min(1),
});

export const ProductQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  stockStatus: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const CreateProductInputSchema = z.object({
  merchantId: z.string().uuid().optional(),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  category: z.string().min(2),
  price: z.number().nonnegative(),
  imageUrl: z.string().optional().nullable(),
  handlingTag: z.nativeEnum(HandlingTag).default(HandlingTag.STANDARD),
  stockStatus: z.nativeEnum(StockStatus).default(StockStatus.IN_STOCK),
  isActive: z.boolean().default(true),
});

export const NotificationQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const AcceptSuborderInputSchema = z.object({
  preparationMinutes: z.number().int().positive().max(180),
  merchantNotes: z.string().max(500).optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
});

export const MarkSuborderReadyInputSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
});

export const RespondAssignmentInputSchema = z.object({
  accept: z.boolean(),
  reason: z.string().max(500).optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
});

export const UpdateStopStatusInputSchema = z.object({
  status: z.nativeEnum(StopStatus),
  failureReason: z.string().max(500).optional().nullable(),
  proofOfDeliveryCode: z.string().max(20).optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
});

export const CreateBatchInputSchema = z.object({
  locality: z.string().min(2),
  maxOrders: z.number().int().positive().max(20).default(8),
  capacityUnits: z.number().int().positive().max(100).default(10),
  suborderIds: z.array(z.string().uuid()).min(1),
  idempotencyKey: z.string().optional().nullable(),
});

export const AssignPartnerInputSchema = z.object({
  batchId: z.string().uuid(),
  partnerId: z.string().uuid(),
  idempotencyKey: z.string().optional().nullable(),
});

