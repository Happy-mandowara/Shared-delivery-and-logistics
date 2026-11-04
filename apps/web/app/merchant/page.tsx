"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Store, 
  ClipboardList, 
  PackageCheck, 
  Clock, 
  IndianRupee, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Layers, 
  Truck,
  ChefHat,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/components/providers";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCardSkeleton } from "@/components/ui/skeleton";

export default function MerchantDashboardOverviewPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Merchant Suborders
  const { data: subordersData, isLoading } = useQuery({
    queryKey: ["merchant-dashboard-suborders"],
    queryFn: async () => {
      const res = await api.get<any>("/merchants/suborders");
      return res.data?.suborders || (Array.isArray(res.data) ? res.data : []);
    },
    refetchInterval: 8000,
  });

  const suborders = subordersData || [];

  // Mutations for quick actions
  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<any>(`/merchants/suborders/${id}/accept`, {
        preparationMinutes: 20,
      });
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess("Order accepted and marked for kitchen preparation.");
      queryClient.invalidateQueries({ queryKey: ["merchant-dashboard-suborders"] });
      setTimeout(() => setActionSuccess(null), 3000);
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to accept order.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  const readyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<any>(`/merchants/suborders/${id}/ready`, {});
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess("Order marked READY FOR PICKUP. Dispatch notified!");
      queryClient.invalidateQueries({ queryKey: ["merchant-dashboard-suborders"] });
      setTimeout(() => setActionSuccess(null), 3000);
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to mark order ready.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  // Calculate Metrics
  const pendingOrders = suborders.filter((s: any) => ["PLACED", "PENDING"].includes(s.status));
  const preparingOrders = suborders.filter((s: any) => ["ACCEPTED", "PREPARING"].includes(s.status));
  const readyOrders = suborders.filter((s: any) => s.status === "READY_FOR_PICKUP");
  const completedOrders = suborders.filter((s: any) => ["PICKED_UP", "DELIVERED"].includes(s.status));
  const todayRevenue = suborders.reduce((sum: number, s: any) => sum + (Number(s.subtotal) || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-3xs font-extrabold uppercase tracking-widest text-[#0F766E]">
              Khammam Central Pilot Outpost
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            {user?.full_name || "Merchant Store Operations"}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Accept incoming orders, manage kitchen preparation timers, and stage packages for rider pickup.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/merchant/orders"
            className="px-5 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center gap-2 min-h-[48px] shadow-xs"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Orders Queue ({pendingOrders.length + preparingOrders.length})</span>
          </Link>
          <Link
            href="/merchant/products/new"
            className="px-4 py-3 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-bold transition-colors min-h-[48px] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Operational Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-3xs uppercase font-extrabold tracking-wider">Awaiting Accept</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-3xl font-black text-neutral-950 block">{pendingOrders.length}</span>
          <span className="text-3xs text-neutral-400 mt-1 block">Immediate action needed</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-3xs uppercase font-extrabold tracking-wider">In Preparation</span>
            <ChefHat className="w-4 h-4 text-teal-600" />
          </div>
          <span className="text-3xl font-black text-teal-800 block">{preparingOrders.length}</span>
          <span className="text-3xs text-neutral-400 mt-1 block">Cooking & packing</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-3xs uppercase font-extrabold tracking-wider">Ready for Rider</span>
            <PackageCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-3xl font-black text-emerald-700 block">{readyOrders.length}</span>
          <span className="text-3xs text-neutral-400 mt-1 block">Staged at pickup desk</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-3xs uppercase font-extrabold tracking-wider">Today&apos;s Revenue</span>
            <IndianRupee className="w-4 h-4 text-neutral-800" />
          </div>
          <span className="text-3xl font-black text-neutral-950 block">₹{todayRevenue.toFixed(2)}</span>
          <span className="text-3xs text-emerald-700 font-bold mt-1 block">{completedOrders.length} completed</span>
        </div>
      </div>

      {/* Urgent Action Queue: Needs Kitchen Attention */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-lg font-black text-neutral-950 tracking-tight">
              Action Required Queue ({pendingOrders.length + preparingOrders.length})
            </h2>
          </div>
          <Link
            href="/merchant/orders"
            className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1"
          >
            <span>View All Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-8 rounded-2xl bg-white border border-neutral-200 animate-pulse h-36" />
        ) : pendingOrders.length === 0 && preparingOrders.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <span className="text-sm font-bold text-neutral-900 block">Kitchen Queue is Clear</span>
            <p className="text-xs text-neutral-500 mt-1">All incoming suborders have been processed or staged for pickup.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pending acceptance */}
            {pendingOrders.map((so: any) => (
              <div
                key={so.id}
                className="p-5 rounded-2xl bg-white border border-amber-300 shadow-2xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-3xs font-extrabold uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                      New Suborder Request
                    </span>
                    <h3 className="text-sm font-black text-neutral-900 mt-1">
                      Suborder #{so.id.slice(0, 8)}
                    </h3>
                  </div>
                  <span className="text-base font-black text-neutral-900">₹{Number(so.subtotal).toFixed(2)}</span>
                </div>

                <div className="space-y-1.5 text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                  <span className="font-bold text-neutral-900 block mb-1">Items to Prepare:</span>
                  {so.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span>{item.quantity}x {item.product_name || item.name}</span>
                      <span className="font-semibold text-neutral-800">₹{(Number(item.unit_price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => acceptMutation.mutate(so.id)}
                    disabled={acceptMutation.isPending}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                  >
                    <ChefHat className="w-4 h-4" />
                    <span>Accept & Begin Prep (20 mins)</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Currently preparing */}
            {preparingOrders.map((so: any) => (
              <div
                key={so.id}
                className="p-5 rounded-2xl bg-white border border-teal-200 shadow-2xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-3xs font-extrabold uppercase text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                      In Kitchen Preparation
                    </span>
                    <h3 className="text-sm font-black text-neutral-900 mt-1">
                      Suborder #{so.id.slice(0, 8)}
                    </h3>
                  </div>
                  <span className="text-base font-black text-neutral-900">₹{Number(so.subtotal).toFixed(2)}</span>
                </div>

                <div className="space-y-1.5 text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                  <span className="font-bold text-neutral-900 block mb-1">Packing Items:</span>
                  {so.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span>{item.quantity}x {item.product_name || item.name}</span>
                      <span className="font-semibold text-neutral-800">₹{(Number(item.unit_price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => readyMutation.mutate(so.id)}
                    disabled={readyMutation.isPending}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>Confirm Packed & Mark Ready for Pickup</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Link
          href="/merchant/products"
          className="p-6 rounded-2xl bg-white border border-neutral-200 hover:border-teal-300 transition-all space-y-2 block"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0F766E] flex items-center justify-center font-bold mb-3">
            <Store className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">Product Catalogue</h3>
          <p className="text-xs text-neutral-500">Manage item pricing, images, and special handling instructions.</p>
        </Link>

        <Link
          href="/merchant/inventory"
          className="p-6 rounded-2xl bg-white border border-neutral-200 hover:border-teal-300 transition-all space-y-2 block"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0F766E] flex items-center justify-center font-bold mb-3">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">Stock & Freshness</h3>
          <p className="text-xs text-neutral-500">Quickly toggle in-stock items or mark &quot;Call to confirm&quot; to prevent cancellation.</p>
        </Link>

        <Link
          href="/merchant/earnings"
          className="p-6 rounded-2xl bg-white border border-neutral-200 hover:border-teal-300 transition-all space-y-2 block"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0F766E] flex items-center justify-center font-bold mb-3">
            <IndianRupee className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">Earnings & Payouts</h3>
          <p className="text-xs text-neutral-500">Review completed suborder revenues and daily settlement ledgers.</p>
        </Link>
      </div>
    </div>
  );
}
