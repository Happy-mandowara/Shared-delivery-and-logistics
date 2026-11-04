"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  ClipboardList, 
  Search, 
  MapPin, 
  ArrowRight, 
  KeyRound, 
  Clock, 
  Package, 
  Filter,
  CheckCircle2
} from "lucide-react";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function AdminOrderPipelinePage() {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["admin-orders-list"],
    queryFn: async () => {
      const res = await api.get<any>("/orders");
      return res.data?.orders || (Array.isArray(res.data) ? res.data : []);
    },
    refetchInterval: 5000,
  });

  const orders = ordersData || [];

  const filtered = orders.filter((o: any) => {
    const matchesFilter = filter === "ALL" || o.status === filter;
    const matchesSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
      (o.delivery_address && o.delivery_address.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Order Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            System-wide order registry across all Khammam shops and customers.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 bg-white p-1 rounded-xl border border-neutral-200">
          {[
            { label: "All", value: "ALL" },
            { label: "Pending", value: "PENDING" },
            { label: "Batched", value: "BATCHED" },
            { label: "In Transit", value: "IN_TRANSIT" },
            { label: "Delivered", value: "DELIVERED" },
            { label: "Cancelled", value: "CANCELLED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap min-h-[36px] transition-colors ${
                filter === tab.value ? "bg-[#0F766E] text-white" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs flex items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by order ID or destination address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-neutral-50 rounded-xl text-xs font-medium border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[40px]"
          />
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <ClipboardList className="w-12 h-12 text-neutral-300 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">No orders match this filter</h2>
          <p className="text-xs text-neutral-500">Check active filters or search terms.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs divide-y divide-neutral-100">
          {filtered.map((ord: any) => (
            <div
              key={ord.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-neutral-900">
                    Order #{ord.id.slice(0, 8)}
                  </span>
                  <StatusBadge status={ord.status} />
                  {ord.batch_id && (
                    <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded bg-teal-50 text-[#0F766E]">
                      Batch #{ord.batch_id.slice(0, 8)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500">
                  {ord.delivery_address || "Wyra Road, Khammam"} · {new Date(ord.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </p>
                {ord.pod_code && (
                  <span className="text-3xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                    POD PIN: {ord.pod_code}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6">
                <div className="text-right">
                  <span className="text-3xs uppercase text-neutral-400 font-extrabold block">Total Amount</span>
                  <span className="text-base font-black text-neutral-950">₹{Number(ord.total_amount).toFixed(2)}</span>
                </div>
                <Link
                  href={`/admin/orders/${ord.id}`}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-[#0F766E] text-white text-xs font-bold transition-colors min-h-[40px] flex items-center gap-1.5"
                >
                  <span>Audit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
