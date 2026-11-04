"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ClipboardList, 
  ChefHat, 
  PackageCheck, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  ShoppingBag,
  Sparkles
} from "lucide-react";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function MerchantOrdersQueuePage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("ALL");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: subordersData, isLoading } = useQuery({
    queryKey: ["merchant-all-suborders"],
    queryFn: async () => {
      const res = await api.get<any>("/merchants/suborders");
      return res.data?.suborders || (Array.isArray(res.data) ? res.data : []);
    },
    refetchInterval: 6000,
  });

  const suborders = subordersData || [];

  // 1. Accept
  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<any>(`/merchants/suborders/${id}/accept`, {
        preparationMinutes: 20,
      });
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess("Suborder accepted! Kitchen notified.");
      queryClient.invalidateQueries({ queryKey: ["merchant-all-suborders"] });
      setTimeout(() => setActionSuccess(null), 3000);
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to accept order.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  // 2. Ready for Pickup
  const readyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<any>(`/merchants/suborders/${id}/ready`, {});
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess("Suborder marked READY FOR PICKUP. Dispatch notified!");
      queryClient.invalidateQueries({ queryKey: ["merchant-all-suborders"] });
      setTimeout(() => setActionSuccess(null), 3000);
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to mark ready.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  // 3. Confirm Handover
  const handoverMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<any>(`/merchants/suborders/${id}/handover`, {});
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess("Handover to Delivery Partner confirmed!");
      queryClient.invalidateQueries({ queryKey: ["merchant-all-suborders"] });
      setTimeout(() => setActionSuccess(null), 3000);
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to confirm handover.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  const filtered = suborders.filter((s: any) => {
    if (filter === "ALL") return true;
    if (filter === "PLACED") return ["PLACED", "PENDING"].includes(s.status);
    if (filter === "PREPARING") return ["ACCEPTED", "PREPARING"].includes(s.status);
    return s.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Merchant Orders Queue
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Lifecycle state machine: Accept Incoming → Kitchen Prep → Mark Ready → Handover to Partner.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 bg-white p-1 rounded-xl border border-neutral-200">
          {[
            { label: "All", value: "ALL" },
            { label: "New", value: "PLACED" },
            { label: "Preparing", value: "PREPARING" },
            { label: "Ready", value: "READY_FOR_PICKUP" },
            { label: "Picked Up", value: "PICKED_UP" },
            { label: "Delivered", value: "DELIVERED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap min-h-[36px] ${
                filter === tab.value
                  ? "bg-[#0F766E] text-white"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <ClipboardList className="w-12 h-12 text-neutral-300 mx-auto" />
          <h3 className="text-base font-bold text-neutral-900">No suborders in this queue</h3>
          <p className="text-xs text-neutral-500">When customers order from your shop, they will appear here in real time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((so: any) => (
            <div
              key={so.id}
              className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-neutral-900">
                      Suborder #{so.id.slice(0, 8)}
                    </span>
                    <StatusBadge status={so.status} />
                  </div>
                  <span className="text-3xs text-neutral-400 block">
                    Parent Order #{so.orderNumber || so.order_number || so.orderId?.slice(0, 8) || so.order_id?.slice(0, 8)} · Created {so.createdAt || so.created_at ? new Date(so.createdAt || so.created_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) : "Today"}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-3xs uppercase font-extrabold text-neutral-400 block">Subtotal</span>
                    <span className="text-base font-black text-neutral-900">₹{Number(so.subtotal).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="p-3 bg-neutral-50 rounded-xl space-y-1.5 border border-neutral-100 text-xs">
                <span className="text-3xs font-extrabold uppercase text-neutral-400 block">Packing Items:</span>
                {so.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-800">
                      {item.quantity}x {item.productName || item.product_name || item.name}
                    </span>
                    <span className="font-bold text-neutral-900">
                      ₹{((Number(item.unitPrice) || Number(item.unit_price) || 0) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Customer Privacy Zone */}
              <div className="text-3xs text-neutral-500 flex items-center justify-between">
                <span>Destination Sector: <strong>{so.deliveryLocality || so.delivery_locality || "Khammam Sector 01"}</strong></span>
                <span className="italic">Customer PII protected per NationX privacy rule</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-end gap-3">
                <Link
                  href={`/merchant/orders/${so.id}`}
                  className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-xs font-bold text-neutral-800 min-h-[44px] flex items-center gap-1.5"
                >
                  <span>Inspection Sheet</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                {["PLACED", "PENDING"].includes(so.status) && (
                  <button
                    onClick={() => acceptMutation.mutate(so.id)}
                    disabled={acceptMutation.isPending}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold min-h-[44px] flex items-center gap-1.5"
                  >
                    <ChefHat className="w-4 h-4" />
                    <span>Accept Order</span>
                  </button>
                )}

                {["ACCEPTED", "PREPARING"].includes(so.status) && (
                  <button
                    onClick={() => readyMutation.mutate(so.id)}
                    disabled={readyMutation.isPending}
                    className="px-5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold min-h-[44px] flex items-center gap-1.5"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>Confirm Packed & Ready for Pickup</span>
                  </button>
                )}

                {so.status === "READY_FOR_PICKUP" && (
                  <button
                    onClick={() => handoverMutation.mutate(so.id)}
                    disabled={handoverMutation.isPending}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold min-h-[44px] flex items-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Confirm Handover to Partner</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
