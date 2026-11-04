"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package, MapPin, KeyRound, Clock, ShieldCheck, Store, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline } from "@/components/ui/timeline";

export default function AdminOrderDetailAuditPage() {
  const params = useParams();
  const orderId = params?.orderId as string;

  const { data: orderData, isLoading } = useQuery({
    queryKey: ["admin-order-audit-detail", orderId],
    queryFn: async () => {
      const res = await api.get<any>(`/orders/${orderId}`);
      return res.data?.order || res.data || null;
    },
    enabled: Boolean(orderId),
  });

  const order = orderData;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-white border border-neutral-200 animate-pulse h-96" />
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center bg-white rounded-3xl border border-neutral-200">
        <Package className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-neutral-900">Order Not Found</h2>
        <Link href="/admin/orders" className="text-xs font-bold text-[#0F766E] hover:underline">
          Back to Order Pipeline
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Order Pipeline</span>
      </Link>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-neutral-950">
                Order Audit #{order.id.slice(0, 8)}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <span className="text-xs text-neutral-500 block">
              UUID: {order.id} · Created {new Date(order.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </span>
          </div>

          {order.batch_id && (
            <Link
              href={`/admin/batches/${order.batch_id}`}
              className="px-4 py-2 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-bold hover:bg-teal-100 min-h-[40px] flex items-center gap-1.5"
            >
              <span>View Batch #{order.batch_id.slice(0, 8)}</span>
            </Link>
          )}
        </div>

        {/* POD Code & Delivery Destination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-neutral-400 block">Delivery Destination</span>
            <span className="text-xs font-bold text-neutral-900 block">{order.delivery_address || "Wyra Road, Khammam"}</span>
            <span className="text-3xs text-neutral-500">
              Coordinates: {order.delivery_latitude || 17.2589}, {order.delivery_longitude || 80.1422}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-[#0F766E] block">Authoritative POD PIN</span>
            <span className="text-xl font-mono font-black text-[#0F766E] block">{order.pod_code || "N/A"}</span>
            <span className="text-3xs text-teal-800">Must match rider drop-off confirmation</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="pt-2">
          <span className="text-xs font-bold text-neutral-900 block mb-3">Lifecycle Milestones</span>
          <Timeline currentStatus={order.status} className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100" />
        </div>

        {/* Items */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold text-neutral-900">Suborder Items Audit</h2>
          <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
            {order.items?.map((item: any, idx: number) => (
              <div key={idx} className="p-4 bg-white flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-neutral-900 block">{item.quantity}x {item.product_name || item.name}</span>
                  <span className="text-3xs text-neutral-500">Merchant: {item.merchant_name || item.merchant_id?.slice(0, 8)}</span>
                </div>
                <span className="font-black text-neutral-900">
                  ₹{(Number(item.unit_price) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
