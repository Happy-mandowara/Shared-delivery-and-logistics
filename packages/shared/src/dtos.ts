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
  SettlementStatus,
} from "./enums";

export interface ApiResponse<T> {
  success: true;
  data: T;
  metadata?: {
    timestamp: string;
    version: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface MerchantDto {
  id: string;
  userId: string;
  name: string;
  code: string;
  address: string;
  locality: string;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  createdAt?: string;
  productCount?: number;
}

export interface ProductDto {
  id: string;
  merchantId: string;
  merchantName?: string;
  merchantLocality?: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  imageUrl: string | null;
  handlingTag: HandlingTag;
  stockStatus: StockStatus;
  stockConfirmedAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddressDto {
  id: string;
  userId: string;
  label: string;
  addressLine: string;
  locality: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  deepLink: string | null;
  orderId: string | null;
  suborderId: string | null;
  batchId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface DeliveryPartnerDto {
  id: string;
  userId: string;
  vehicleType: string | null;
  capacityUnits: number;
  availability: PartnerAvailability;
  currentLocality: string | null;
  latitude: number | null;
  longitude: number | null;
  verified: boolean;
  createdAt: string;
}

export interface OrderItemDto {
  id: string;
  suborderId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  handlingTag: string | null;
  weightUnits: number | null;
  createdAt: string;
}

export interface MerchantSuborderDto {
  id: string;
  orderId: string;
  merchantId: string;
  merchantName?: string;
  merchantLocality?: string;
  suborderNumber: string;
  status: SuborderStatus;
  subtotal: number;
  preparationDeadline: string | null;
  readyAt: string | null;
  handedOverAt: string | null;
  items?: OrderItemDto[];
  createdAt: string;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  fulfillmentMode: FulfillmentMode;
  deliveryAddress: string;
  deliveryLocality: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  deliveryWindowStart: string | null;
  deliveryWindowEnd: string | null;
  dispatchDeadline: string | null;
  customerNotes: string | null;
  paymentReference: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  suborders?: MerchantSuborderDto[];
  podCode?: string;
  podVerifiedAt?: string | null;
  createdAt: string;
}

export interface DeliveryStopDto {
  id: string;
  batchId: string;
  sequence: number;
  type: StopType;
  status: StopStatus;
  merchantId: string | null;
  orderId: string | null;
  suborderId: string | null;
  address: string;
  locality: string;
  latitude: number | null;
  longitude: number | null;
  instructions: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
}

export interface DeliveryBatchDto {
  id: string;
  batchCode: string;
  status: BatchStatus;
  locality: string;
  maxOrders: number;
  capacityUnits: number;
  estimatedDistanceKm: number | null;
  estimatedDurationMin: number | null;
  plannedAt: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  stops?: DeliveryStopDto[];
  createdAt: string;
}

export interface DeliveryEventDto {
  id: string;
  type: DeliveryEventType;
  message: string;
  reason: string | null;
  actorId: string | null;
  orderId: string | null;
  suborderId: string | null;
  batchId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ServiceZoneDto {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  isActive: boolean;
  maxBatchOrders: number;
  maxBatchCapacity: number;
  baseDeliveryFee: number;
  perKmFee: number;
  minOrderSubtotal: number;
  localities?: ServiceLocalityDto[];
  createdAt: string;
}

export interface ServiceLocalityDto {
  id: string;
  zoneId: string;
  name: string;
  code: string;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
}

export interface PartnerSettlementDto {
  id: string;
  partnerId: string;
  batchId: string;
  batchCode?: string;
  basePayout: number;
  stopAllowance: number;
  distancePayout: number;
  totalPayout: number;
  stopsCompleted: number;
  status: SettlementStatus;
  settlementNotes: string;
  disbursedAt: string | null;
  createdAt: string;
}
