/**
 * NationX Official Provisional Design Tokens
 */
export const DESIGN_TOKENS = {
  colors: {
    primaryTeal: "#0F766E",
    darkModePrimary: "#34B8AB",
    lightSurface: "#F8FAFA",
    darkSurface: "#0B1514",
    danger: "#B42318",
    success: "#166534",
    warning: "#92400E",
  },
  typography: {
    bodyTextSp: 16,
    codeFont: "Geist Mono",
    sansFont: "Geist Sans",
  },
  ergonomics: {
    minTouchTargetDp: 48,
    borderRadius: 12,
  },
} as const;

/**
 * Shared Stock Vocabulary
 */
export const STOCK_VOCABULARY = {
  IN_STOCK: "In stock",
  CALL_TO_CONFIRM: "Call to confirm",
  OUT_OF_STOCK: "Out of stock",
  STOCK_FRESHNESS_DAYS_LIMIT: 3,
} as const;

/**
 * Price & Inquiry Vocabulary
 */
export const COMMERCIAL_VOCABULARY = {
  PRICE_UNCONFIRMED: "Price not yet confirmed (quotation)",
  CALL_FOR_PRICE: "Call for price",
  ORDER_TYPES: {
    REQUEST: "Request",
    QUOTATION: "Quotation",
    CONFIRMED_ORDER: "Confirmed Order",
  },
} as const;

/**
 * Supported Operating Models
 */
export const OPERATING_MODELS = [
  "Visit the shop",
  "Pickup",
  "Delivery",
  "By appointment",
  "Quotation",
] as const;

/**
 * Pilot Locality Defaults (Khammam)
 */
export const PILOT_LOCALITY = {
  CITY: "Khammam",
  STATE: "Telangana",
  DEFAULT_ZONE: "Khammam Central",
  DEFAULT_MAX_BATCH_ORDERS: 8,
  DEFAULT_MAX_BATCH_STOPS: 16,
  DEFAULT_PARTNER_CAPACITY_UNITS: 10,
} as const;

