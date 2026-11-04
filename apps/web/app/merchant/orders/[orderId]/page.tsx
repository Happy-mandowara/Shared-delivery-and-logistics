"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Store, 
  ChefHat, 
  PackageCheck, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ShieldCheck,
  FileText
} from "lucide-react";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline } from "@/components/ui/timeline";

export default function MerchantSuborderDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const suborderId = params?.orderId as string;

  const { data: suborderData, isLoading } = useQuery({
    queryKey: ["merchant-suborder-detail", suborderId],
    queryFn: async () => {
      const res = await api.get<any>(`/merchants/suborders/${suborderId}`);
      return res.data?.suborder || null;
    },
    enabled: Boolean(suborderId),
  });

  const suborder = suborderData;

  const acceptMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/merchants/suborders/${suborderId}/accept`, { preparationMinutes: 20 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-suborder-detail", suborderId] });
    },
  });

  const readyMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/merchants/suborders/${suborderId}/ready`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-suborder-detail", suborderId] });
    },
  });

  const handoverMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/merchants/suborders/${suborderId}/handover`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-suborder-detail", suborderId] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-white border border-neutral-200 animate-pulse h-80" />
    );
  }

  if (!suborder) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
        <Store className="w-12 h-12 text-neutral-300 mx-auto" />
        <h2 className="text-xl font-bold text-neutral-900">Suborder Not Found</h2>
        <Link href="/merchant/orders" className="text-xs font-bold text-[#0F766E] hover:underline">
          Return to Orders Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/merchant/orders"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Orders Queue</span>
      </Link>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-neutral-950">
                Suborder #{suborder.id.slice(0, 8)}
              </h1>
              <StatusBadge status={suborder.status} />
            </div>
            <span className="text-xs text-neutral-500 block">
              Created {new Date(suborder.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {suborder.status === "PENDING" && (
              <button
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold min-h-[44px]"
              >
                Accept Order
              </button>
            )}
            {suborder.status === "PREPARING" && (
              <button
                onClick={() => readyMutation.mutate()}
                disabled={readyMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold min-h-[44px]"
              >
                Mark Ready for Pickup
              </button>
            )}
            {suborder.status === "READY_FOR_PICKUP" && (
              <button
                onClick={() => handoverMutation.mutate()}
                disabled={handoverMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold min-h-[44px]"
              >
                Confirm Handover to Partner
              </button>
            )}
          </div>
        </div>

        {/* Itemized packing checklist */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-neutral-900">Packing Checklist</h2>
          <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
            {suborder.items?.map((item: any, idx: number) => (
              <div key={idx} className="p-4 bg-white flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-neutral-900 block">
                    {item.quantity}x {item.product_name || item.name}
                  </span>
                  <span className="text-3xs text-neutral-400">
                    Product ID: {item.product_id?.slice(0, 8)}
                  </span>
                </div>
                <span className="text-sm font-black text-neutral-900">
                  ₹{(Number(item.unit_price) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Details */}
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-600 flex items-center justify-between">
          <span>Destination Sector: <strong>{suborder.delivery_locality || "Khammam Sector 01"}</strong></span>
          <span className="font-bold text-neutral-900">Subtotal: ₹{Number(suborder.subtotal).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
