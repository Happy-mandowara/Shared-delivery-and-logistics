"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers";
import { api } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store,
  Clock,
  ChefHat,
  PackageCheck,
  Truck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Plus,
  Flame,
  ShieldCheck,
  Layers,
  ArrowRight
} from "lucide-react";

export default function MerchantPortalPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"orders" | "catalog">("orders");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [acceptingSuborder, setAcceptingSuborder] = useState<any | null>(null);
  const [estimatedPrepMinutes, setEstimatedPrepMinutes] = useState<number>(20);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New Product Form state
  const [newProdName, setNewProdName] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Specials");
  const [newProdPrice, setNewProdPrice] = useState("180");
  const [newProdHandling, setNewProdHandling] = useState("STANDARD");
  const [newProdDesc, setNewProdDesc] = useState("");

  // 1. Fetch Merchant Suborders Queue
  const {
    data: subordersData,
    isLoading: isLoadingSuborders,
    refetch: refetchSuborders,
  } = useQuery({
    queryKey: ["merchant-suborders"],
    queryFn: async () => {
      const res = await api.get<any>("/merchants/suborders");
      const list = Array.isArray(res.data) ? res.data : res.data?.suborders || [];
      return list.map((sub: any) => ({
        id: sub.id,
        suborderNumber: sub.suborderNumber || sub.suborder_number,
        merchantId: sub.merchantId || sub.merchant_id,
        status: sub.status,
        subtotal: sub.subtotal,
        deliveryLocality: sub.deliveryLocality || sub.delivery_locality,
        deliveryAddress: sub.deliveryAddress || sub.delivery_address,
        prepDeadline: sub.preparationDeadline || sub.preparation_deadline,
        items: (sub.items || []).map((it: any) => ({
          id: it.id,
          productName: it.productName || it.product_name,
          quantity: it.quantity,
          unitPrice: it.unitPrice || it.unit_price,
          handlingTag: it.handlingTag || it.handling_tag,
        })),
      }));
    },
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (user?.id) {
      refetchSuborders();
    }
  }, [user?.id, refetchSuborders]);

  const suborders = subordersData || [];

  // Determine current merchant ID from first suborder or query
  const merchantId = suborders[0]?.merchantId || "10000000-0000-0000-0000-000000000001";

  // 2. Fetch Merchant Products Catalog
  const {
    data: productsData,
    isLoading: isLoadingProducts,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["merchant-catalog", merchantId],
    queryFn: async () => {
      const res = await api.get<any>(`/merchants/${merchantId}/products`);
      return res.data?.products || [];
    },
    enabled: Boolean(user && activeTab === "catalog"),
  });

  const products = productsData || [];

  // Accept Suborder Mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!acceptingSuborder) return;
      setActionError(null);
      setActionSuccess(null);
      const res = await api.post(`/merchants/suborders/${acceptingSuborder.id}/accept`, {
        preparationMinutes: estimatedPrepMinutes,
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to accept suborder");
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess(`Suborder accepted! Preparation timer set for ${estimatedPrepMinutes} mins.`);
      setAcceptingSuborder(null);
      queryClient.invalidateQueries({ queryKey: ["merchant-suborders"] });
    },
    onError: (err: any) => setActionError(err.message),
  });

  // Mark Ready Mutation
  const markReadyMutation = useMutation({
    mutationFn: async (suborderId: string) => {
      setActionError(null);
      setActionSuccess(null);
      const res = await api.post(`/merchants/suborders/${suborderId}/ready`, {});
      if (!res.success) throw new Error(res.error?.message || "Failed to mark ready");
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess("Suborder confirmed READY FOR PICKUP! Delivery partner notified.");
      queryClient.invalidateQueries({ queryKey: ["merchant-suborders"] });
    },
    onError: (err: any) => setActionError(err.message),
  });

  // Confirm Handover Mutation
  const confirmHandoverMutation = useMutation({
    mutationFn: async (suborderId: string) => {
      setActionError(null);
      setActionSuccess(null);
      const res = await api.post(`/merchants/suborders/${suborderId}/handover`, {});
      if (!res.success) throw new Error(res.error?.message || "Failed to confirm handover");
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess("Physical handover confirmed to assigned delivery partner!");
      queryClient.invalidateQueries({ queryKey: ["merchant-suborders"] });
    },
    onError: (err: any) => setActionError(err.message),
  });

  // Add Product Mutation
  const addProductMutation = useMutation({
    mutationFn: async () => {
      setActionError(null);
      setActionSuccess(null);
      const res = await api.post(`/merchants/${merchantId}/products`, {
        name: newProdName.trim(),
        description: newProdDesc.trim() || undefined,
        category: newProdCategory.trim(),
        price: parseFloat(newProdPrice),
        handlingTag: newProdHandling,
        stockStatus: "IN_STOCK",
        isActive: true,
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to add product");
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess(`Product "${newProdName}" published to Khammam catalogue!`);
      setIsAddProductOpen(false);
      setNewProdName("");
      setNewProdDesc("");
      queryClient.invalidateQueries({ queryKey: ["merchant-catalog"] });
    },
    onError: (err: any) => setActionError(err.message),
  });

  const filteredSuborders = suborders.filter((s: any) =>
    filterStatus === "ALL" ? true : s.status === filterStatus
  );

  return (
    <div className="min-h-screen bg-[#F8FAFA] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Header */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
                Merchant Kitchen & Shop Portal
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                Khammam Operations
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Logged in as: <strong className="text-neutral-800">{user?.full_name}</strong> ({user?.email})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchSuborders();
                refetchProducts();
              }}
              className="text-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <span className="font-semibold">{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-xs font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}
        {actionError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
            <span className="font-semibold">{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-xs font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-neutral-200 pb-2">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === "orders"
                ? "bg-[#0F766E] text-white shadow-2xs"
                : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
            }`}
          >
            Suborder Queue ({suborders.length})
          </button>
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === "catalog"
                ? "bg-[#0F766E] text-white shadow-2xs"
                : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
            }`}
          >
            Shop Inventory & Catalogue
          </button>
        </div>

        {/* TAB 1: SUBORDERS QUEUE */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="font-bold text-neutral-500 uppercase tracking-wider text-[11px]">
                Status:
              </span>
              {["ALL", "PLACED", "ACCEPTED", "READY_FOR_PICKUP", "PICKED_UP"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                    filterStatus === st
                      ? "bg-[#0F766E] text-white"
                      : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
                  }`}
                >
                  {st.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {isLoadingSuborders ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 bg-white rounded-2xl border border-neutral-200 animate-pulse" />
                ))}
              </div>
            ) : filteredSuborders.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200 text-neutral-500">
                <Store className="w-12 h-12 mx-auto text-neutral-300 mb-2 stroke-1" />
                <p className="text-sm font-semibold">No suborders in this queue.</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Incoming shared-delivery orders will appear here for kitchen acceptance.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSuborders.map((sub: any) => {
                  const isPlaced = sub.status === "PLACED";
                  const isAccepted = sub.status === "ACCEPTED";
                  const isReady = sub.status === "READY_FOR_PICKUP";
                  const isPickedUp = sub.status === "PICKED_UP";

                  return (
                    <div
                      key={sub.id}
                      className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-neutral-900">
                            #{sub.suborderNumber}
                          </span>
                          <StatusBadge status={sub.status} />
                        </div>

                        {/* Customer Locality */}
                        <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                          <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                          <span className="truncate">{sub.deliveryAddress}</span>
                        </div>

                        {/* Items Checklist */}
                        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-1.5">
                          <div className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                            Preparation Items:
                          </div>
                          {sub.items.map((it: any) => (
                            <div key={it.id} className="flex justify-between text-xs text-neutral-800">
                              <span className="font-semibold">
                                {it.quantity}x {it.productName}
                              </span>
                              {it.handlingTag && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neutral-200 font-bold">
                                  {it.handlingTag}
                                </span>
                              )}
                            </div>
                          ))}
                          <div className="pt-2 border-t border-neutral-200 flex justify-between text-xs font-bold text-neutral-900">
                            <span>Subtotal</span>
                            <span>₹{Number(sub.subtotal).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* State Transition Actions */}
                      <div className="pt-2 border-t border-neutral-100">
                        {isPlaced && (
                          <Button
                            variant="primary"
                            className="w-full text-xs font-bold py-2.5 flex items-center justify-center gap-1.5"
                            onClick={() => setAcceptingSuborder(sub)}
                          >
                            <ChefHat className="w-4 h-4" />
                            Accept & Set Prep Time
                          </Button>
                        )}

                        {isAccepted && (
                          <Button
                            variant="primary"
                            className="w-full text-xs font-bold py-2.5 bg-emerald-700 hover:bg-emerald-800 flex items-center justify-center gap-1.5"
                            onClick={() => markReadyMutation.mutate(sub.id)}
                            disabled={markReadyMutation.isPending}
                          >
                            <PackageCheck className="w-4 h-4" />
                            Mark Ready for Pickup
                          </Button>
                        )}

                        {isReady && (
                          <Button
                            variant="primary"
                            className="w-full text-xs font-bold py-2.5 bg-indigo-700 hover:bg-indigo-800 flex items-center justify-center gap-1.5"
                            onClick={() => confirmHandoverMutation.mutate(sub.id)}
                            disabled={confirmHandoverMutation.isPending}
                          >
                            <Truck className="w-4 h-4" />
                            Confirm Handover to Rider
                          </Button>
                        )}

                        {isPickedUp && (
                          <div className="p-2 text-center text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200">
                            ✓ Handed over to Delivery Partner
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SHOP INVENTORY & CATALOGUE */}
        {activeTab === "catalog" && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Shop Products & Stock Status
                </h2>
                <p className="text-xs text-neutral-500">
                  Manage product availability and publish items to the Khammam marketplace.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddProductOpen(true)}
                className="font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </div>

            {isLoadingProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-neutral-50 rounded-xl border border-neutral-200 animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="p-12 text-center text-neutral-500">
                <Store className="w-10 h-10 mx-auto text-neutral-300 mb-2 stroke-1" />
                <p className="text-xs font-semibold">No products found for this shop.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p: any) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-sm text-neutral-900">{p.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.stockStatus === "IN_STOCK"
                              ? "bg-emerald-100 text-emerald-800"
                              : p.stockStatus === "CALL_TO_CONFIRM"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {p.stockStatus.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
                        {p.description || "Fresh preparation in Khammam"}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-xs">
                      <span className="font-mono text-neutral-500">{p.category}</span>
                      <span className="font-extrabold text-neutral-900 text-sm">
                        ₹{Number(p.price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Accept Suborder Modal */}
      {acceptingSuborder && (
        <Modal
          isOpen={Boolean(acceptingSuborder)}
          onClose={() => setAcceptingSuborder(null)}
          title={`Accept Suborder #${acceptingSuborder.suborderNumber}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs text-neutral-600">
              Confirm shop acceptance to prepare this suborder. Set the estimated kitchen preparation
              time to help the dispatch coordinator schedule the delivery partner.
            </p>

            <div>
              <label className="block text-xs font-bold text-neutral-800 mb-1">
                Estimated Preparation Time (Minutes)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 20, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setEstimatedPrepMinutes(mins)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                      estimatedPrepMinutes === mins
                        ? "bg-teal-50 border-teal-600 text-teal-800"
                        : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button variant="ghost" onClick={() => setAcceptingSuborder(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? "Accepting..." : "Confirm Acceptance"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Product Modal */}
      {isAddProductOpen && (
        <Modal
          isOpen={isAddProductOpen}
          onClose={() => setIsAddProductOpen(false)}
          title="Publish New Product to Khammam Shop"
          maxWidth="max-w-md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addProductMutation.mutate();
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Product Name *</label>
              <Input
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                placeholder="e.g. Special Dum Biryani / Fresh Atta 5kg"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Category *</label>
                <Input
                  value={newProdCategory}
                  onChange={(e) => setNewProdCategory(e.target.value)}
                  placeholder="e.g. Biryani & Rice"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Price (₹ INR) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Handling Requirement</label>
              <select
                value={newProdHandling}
                onChange={(e) => setNewProdHandling(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white"
              >
                <option value="STANDARD">Standard</option>
                <option value="HOT_FOOD">Hot Food</option>
                <option value="FRAGILE">Fragile</option>
                <option value="PERISHABLE">Perishable</option>
                <option value="HEAVY">Heavy</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Description</label>
              <Input
                value={newProdDesc}
                onChange={(e) => setNewProdDesc(e.target.value)}
                placeholder="Brief ingredients or preparation detail"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
              <Button type="button" variant="ghost" onClick={() => setIsAddProductOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={addProductMutation.isPending}>
                {addProductMutation.isPending ? "Publishing..." : "Publish Product"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
