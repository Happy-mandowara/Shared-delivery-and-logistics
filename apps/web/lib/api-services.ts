import { apiClient, ApiResponse } from "./api-client";

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post<{ token: string; user: any }>("/auth/login", { email, password });
    if (res.success && res.data?.token) {
      apiClient.setToken(res.data.token);
    }
    return res;
  },
  me: async () => {
    return apiClient.get<{ user: any }>("/auth/me");
  },
  logout: async () => {
    const res = await apiClient.post("/auth/logout");
    apiClient.setToken(null);
    return res;
  },
};

export const shopApi = {
  getMerchants: async (params?: { locality?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.locality) query.set("locality", params.locality);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiClient.get<{ merchants: any[] }>(`/merchants${qs}`);
  },
  getMerchantById: async (id: string) => {
    return apiClient.get<{ merchant: any }>(`/merchants/${id}`);
  },
  getMerchantProducts: async (merchantId: string, params?: { category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return apiClient.get<{ products: any[]; categories: string[] }>(`/merchants/${merchantId}/products${qs}`);
  },
};

export const productApi = {
  getProductById: async (id: string) => {
    return apiClient.get<{ product: any }>(`/products/${id}`);
  },
  createProduct: async (merchantId: string, data: any) => {
    return apiClient.post(`/merchants/${merchantId}/products`, data);
  },
  updateProduct: async (productId: string, data: any) => {
    return apiClient.patch(`/products/${productId}`, data);
  },
};

export const orderApi = {
  createOrder: async (data: any) => {
    return apiClient.post<{ order: any; suborders: any[]; feePolicyNotice?: string }>("/orders", data);
  },
  getOrders: async () => {
    return apiClient.get<any[]>("/orders");
  },
  getOrderById: async (id: string) => {
    return apiClient.get<any>(`/orders/${id}`);
  },
  cancelOrder: async (id: string, reason: string) => {
    return apiClient.post(`/orders/${id}/cancel`, { reason });
  },
};

export const customerApi = {
  getAddresses: async () => {
    return apiClient.get<any[]>("/customer/addresses");
  },
  createAddress: async (data: any) => {
    return apiClient.post<any>("/customer/addresses", data);
  },
};

export const merchantApi = {
  getQueue: async () => {
    return apiClient.get<any[]>("/merchants/suborders");
  },
  acceptSuborder: async (id: string, preparationMinutes: number, merchantNotes?: string) => {
    return apiClient.post(`/merchants/suborders/${id}/accept`, { preparationMinutes, merchantNotes });
  },
  readySuborder: async (id: string, notes?: string) => {
    return apiClient.post(`/merchants/suborders/${id}/ready`, { notes });
  },
  confirmHandover: async (id: string, notes?: string) => {
    return apiClient.post(`/merchants/suborders/${id}/handover`, { notes });
  },
};

export const batchApi = {
  getCandidates: async (locality?: string) => {
    const qs = locality ? `?locality=${encodeURIComponent(locality)}` : "";
    return apiClient.get<any[]>(`/batches/candidates${qs}`);
  },
  createBatch: async (data: { suborderIds: string[]; locality: string; capacityUnits?: number; maxOrders?: number; idempotencyKey?: string }) => {
    return apiClient.post<{ batch_id: string; batch_code: string; locality: string; total_stops: number }>("/batches", data);
  },
  getBatchById: async (id: string) => {
    return apiClient.get<{ batch: any; stops: any[] }>(`/batches/${id}`);
  },
  assignBatch: async (batchId: string, partnerId: string) => {
    return apiClient.post(`/batches/${batchId}/assign`, { partnerId });
  },
  reassignBatch: async (batchId: string, newPartnerId: string, reason: string) => {
    return apiClient.post(`/batches/${batchId}/reassign`, { newPartnerId, reason });
  },
};

export const partnerApi = {
  getAssignments: async () => {
    return apiClient.get<any[]>("/partners/assignments");
  },
  respondAssignment: async (assignmentId: string, accept: boolean, reason?: string) => {
    return apiClient.post(`/partners/assignments/${assignmentId}/respond`, { accept, reason });
  },
  getStops: async (batchId?: string) => {
    const qs = batchId ? `?batchId=${batchId}` : "";
    return apiClient.get<any[]>(`/partners/stops${qs}`);
  },
  updateStopStatus: async (stopId: string, data: { status: string; failureReason?: string; proofOfDeliveryCode?: string; idempotencyKey?: string }) => {
    return apiClient.post(`/partners/stops/${stopId}/status`, data);
  },
  reportException: async (stopId: string, reason: string, notes?: string, createReturnStop?: boolean) => {
    return apiClient.post(`/stops/${stopId}/exception`, { reason, notes, createReturnStop });
  },
  updateAvailability: async (data: { availability: "AVAILABLE" | "OFFLINE" | "BUSY"; currentLocality?: string; latitude?: number; longitude?: number }) => {
    return apiClient.patch("/partners/availability", data);
  },
  getSettlements: async () => {
    return apiClient.get<any>("/partners/settlements");
  },
};

export const adminApi = {
  getBatches: async () => {
    return apiClient.get<{ batches: any[] }>("/batches");
  },
  getPartners: async () => {
    return apiClient.get<{ partners: any[] }>("/partners");
  },
  getSettlements: async (partnerId?: string) => {
    const qs = partnerId ? `?partnerId=${partnerId}` : "";
    return apiClient.get<{ settlements: any[]; summary: any }>(`/admin/settlements${qs}`);
  },
  calculateSettlements: async (batchId: string) => {
    return apiClient.post("/admin/settlements/calculate", { batchId });
  },
  getEvents: async () => {
    return apiClient.get<{ events: any[] }>("/events");
  },
};

export const zoneApi = {
  getZones: async () => {
    return apiClient.get<{ zones: any[] }>("/zones");
  },
  checkEligibility: async (latitude: number, longitude: number) => {
    return apiClient.get<{ eligible: boolean; zone?: any }>(`/zones?latitude=${latitude}&longitude=${longitude}`);
  },
};

export const notificationApi = {
  getNotifications: async () => {
    return apiClient.get<{ notifications: any[]; unreadCount: number }>("/notifications");
  },
  markRead: async (id: string) => {
    return apiClient.patch<{ notification: any }>(`/notifications/${id}/read`);
  },
  markAllRead: async () => {
    return apiClient.post("/notifications/read-all");
  },
};
