"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  Package, 
  MapPin, 
  Clock, 
  ArrowRight, 
  Truck, 
  ChevronRight, 
  CheckCircle2, 
  Filter,
  ShoppingBag,
  KeyRound
} from "lucide-react";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function CustomerOrdersHistoryPage() {
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["customer-all-orders"],
    queryFn: async () => {
      const res = await api.get<any>("/orders");
      return res.data?.orders || (Array.isArray(res.data) ? res.data : []);
    },
  });

  const orders = ordersData || [];

  const filteredOrders = orders.filter((o: any) => {
    if (filter === "ACTIVE") {
      return ["PENDING", "ACCEPTED", "BATCHED", "ASSIGNED", "DISPATCHED", "IN_TRANSIT"].includes(o.status);
    }
    if (filter === "COMPLETED") {
      return ["DELIVERED", "COMPLETED", "CANCELLED", "FAILED"].includes(o.status);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            My Orders
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Review your past purchases and track active shared deliveries across Khammam.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-neutral-200">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[36px] ${
              filter === "ALL" ? "bg-[#0F766E] text-white" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setFilter("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[36px] ${
              filter === "ACTIVE" ? "bg-[#0F766E] text-white" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            In Transit
          </button>
          <button
            onClick={() => setFilter("COMPLETED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[36px] ${
              filter === "COMPLETED" ? "bg-[#0F766E] text-white" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-4">
          <Package className="w-12 h-12 text-neutral-300 mx-auto" />
          <h3 className="text-base font-bold text-neutral-900">No orders found</h3>
          <p className="text-xs text-neutral-500">
            {filter === "ACTIVE"
              ? "You have no orders currently in transit."
              : "You haven't placed any orders yet."}
          </p>
          <Link
            href="/customer/explore"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold"
          >
            Explore Khammam Shops
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order: any) => (
            <div
              key={order.id}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs hover:border-teal-300 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center font-bold">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-extrabold text-neutral-900 block">
                      Order #{order.id.slice(0, 8)}
                    </span>
                    <span className="text-3xs text-neutral-500">
                      Placed on {(order.createdAt || order.created_at) ? new Date(order.createdAt || order.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Today"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status} />
                  <span className="text-base font-black text-neutral-900">
                    ₹{Number(order.total || order.total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Order Meta & PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-neutral-600">
                <div>
                  <span className="text-3xs uppercase font-bold text-neutral-400 block">Delivery To</span>
                  <span className="font-semibold text-neutral-900 truncate block">
                    {order.deliveryAddress || order.delivery_address || "Wyra Road, Khammam"}
                  </span>
                </div>

                <div>
                  <span className="text-3xs uppercase font-bold text-neutral-400 block">Payment Method</span>
                  <span className="font-semibold text-neutral-900">
                    {(order.paymentReference || order.payment_method || "CASH_ON_DELIVERY").replace(/_/g, " ")}
                  </span>
                </div>

                {(order.podCode || order.pod_code) && (
                  <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-between">
                    <span className="text-3xs font-bold text-teal-800">4-Digit POD PIN:</span>
                    <span className="text-sm font-black text-[#0F766E] tracking-widest">{order.podCode || order.pod_code}</span>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
                <Link
                  href={`/customer/orders/${order.id}`}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-[#0F766E] text-white text-xs font-bold transition-colors min-h-[40px] flex items-center gap-1.5"
                >
                  <span>View Full Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                {["PENDING", "ACCEPTED", "BATCHED", "ASSIGNED", "DISPATCHED", "IN_TRANSIT"].includes(order.status) && (
                  <Link
                    href={`/customer/track/${order.batch_id || order.id}`}
                    className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-xs font-bold text-neutral-800 transition-colors min-h-[40px] flex items-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Live Tracking</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
