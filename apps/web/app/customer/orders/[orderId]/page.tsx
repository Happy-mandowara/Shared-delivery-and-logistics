"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Package, 
  MapPin, 
  Clock, 
  KeyRound, 
  ArrowLeft, 
  Truck, 
  Store, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  XCircle,
  Sparkles
} from "lucide-react";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline } from "@/components/ui/timeline";

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = params?.orderId as string;
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch Order Details
  const { data: orderData, isLoading } = useQuery({
    queryKey: ["customer-order-detail", orderId],
    queryFn: async () => {
      const res = await api.get<any>(`/orders/${orderId}`);
      return res.data?.order || res.data || null;
    },
    enabled: Boolean(orderId),
  });

  const order = orderData;

  // Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await api.post<any>(`/orders/${orderId}/cancel`, {
        reason: reason || "Customer requested cancellation before dispatch",
      });
      return res.data;
    },
    onSuccess: () => {
      setShowCancelModal(false);
      queryClient.invalidateQueries({ queryKey: ["customer-order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["customer-all-orders"] });
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to cancel order.");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-white border border-neutral-200 animate-pulse h-96 space-y-4">
        <div className="h-8 bg-neutral-200 rounded w-1/3" />
        <div className="h-32 bg-neutral-100 rounded" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-4">
        <Package className="w-12 h-12 text-neutral-300 mx-auto" />
        <h2 className="text-xl font-bold text-neutral-900">Order Not Found</h2>
        <p className="text-xs text-neutral-500">The requested order could not be located or does not belong to your account.</p>
        <Link
          href="/customer/orders"
          className="inline-block px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold"
        >
          View My Orders
        </Link>
      </div>
    );
  }

  const isCancellable = ["PENDING", "CONFIRMED", "ACCEPTED"].includes(order.status);
  const podCode = order.podCode || order.pod_code;
  const createdAt = order.createdAt || order.created_at;
  const totalAmount = Number(order.total || order.total_amount || 0);
  const deliveryAddress = order.deliveryAddress || order.delivery_address || "Wyra Road, Khammam";
  const paymentMethod = order.paymentReference || order.payment_method || "CASH_ON_DELIVERY";
  const items = order.items?.length
    ? order.items
    : order.suborders?.flatMap((s: any) =>
        (s.items || []).map((i: any) => ({
          ...i,
          merchant_name: s.merchantName || s.merchant_name || "Khammam Shop",
        }))
      ) || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back button */}
      <Link
        href="/customer/orders"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Order History</span>
      </Link>

      {/* Order Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-neutral-950">
                Order #{order.id.slice(0, 8)}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <span className="text-xs text-neutral-500 block">
              Placed on {createdAt ? new Date(createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Today"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(order.batch_id || order.batchId) && (
              <Link
                href={`/customer/track/${order.batch_id || order.batchId}`}
                className="px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[44px]"
              >
                <Truck className="w-4 h-4" />
                <span>Live Route Tracking</span>
              </Link>
            )}
            <Link
              href={`/customer/orders/${order.id}/complaint`}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[44px]"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Report Item Defect</span>
            </Link>
            {isCancellable && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors min-h-[44px]"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* 4-Digit Proof of Delivery PIN Banner */}
        {podCode && !["CANCELLED", "FAILED"].includes(order.status) && (
          <div className="p-5 rounded-2xl bg-teal-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-teal-400" />
                <span className="text-sm font-bold text-white">Your Doorstep Handover PIN</span>
              </div>
              <p className="text-xs text-neutral-300 max-w-lg">
                Do NOT share this code until the delivery partner is physically in front of you and you have verified all packages.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-neutral-900 border border-teal-500/40 px-4 py-2 rounded-xl shrink-0">
              <span className="text-2xl font-black tracking-widest text-[#34B8AB]">
                {podCode}
              </span>
            </div>
          </div>
        )}

        {/* Lifecycle Timeline */}
        <div className="pt-2">
          <span className="text-3xs font-extrabold uppercase tracking-wider text-neutral-400 block mb-4">
            Fulfilment Progress
          </span>
          <Timeline currentStatus={order.status} className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100" />
        </div>
      </div>

      {/* Suborders & Items Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Items */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-neutral-950">
              Purchased Items ({items.length})
            </h2>

            <div className="divide-y divide-neutral-100">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-neutral-900 block">
                      {item.productName || item.product_name || item.name || "Catalog Product"}
                    </span>
                    <span className="text-3xs text-neutral-500">
                      Quantity: <strong>{item.quantity}</strong> · Merchant: <strong>{item.merchant_name || item.merchantName || "Khammam Shop"}</strong>
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-neutral-900">
                    ₹{((Number(item.unitPrice) || Number(item.unit_price) || Number(item.price) || 0) * (item.quantity || 1)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Address & Payment Summary */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-neutral-950">Delivery & Payment</h2>

            <div className="space-y-3 text-xs text-neutral-600">
              <div>
                <span className="text-3xs font-bold uppercase text-neutral-400 block">Delivery Address</span>
                <span className="font-semibold text-neutral-900 block mt-0.5">
                  {deliveryAddress}
                </span>
              </div>

              <div>
                <span className="text-3xs font-bold uppercase text-neutral-400 block">Payment Method</span>
                <span className="font-semibold text-neutral-900 block mt-0.5">
                  {paymentMethod.replace(/_/g, " ")}
                </span>
              </div>

              {(order.deliveryInstructions || order.delivery_instructions || order.customerNotes) && (
                <div>
                  <span className="text-3xs font-bold uppercase text-neutral-400 block">Instructions</span>
                  <span className="text-neutral-700 italic block mt-0.5">
                    {order.deliveryInstructions || order.delivery_instructions || order.customerNotes}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-600">Total Paid / Due</span>
              <span className="text-xl font-black text-neutral-950">
                ₹{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold">Cancel This Order?</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to cancel Order #{order.id.slice(0, 8)}? Merchant preparations will be discontinued.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">Reason for Cancellation</label>
              <textarea
                rows={2}
                placeholder="e.g. Ordered by mistake, need to change delivery address"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {actionError && (
              <span className="text-xs text-rose-600 font-bold block">{actionError}</span>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 min-h-[44px]"
              >
                Keep Order
              </button>
              <button
                onClick={() => cancelMutation.mutate(cancelReason)}
                disabled={cancelMutation.isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold min-h-[44px]"
              >
                {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
