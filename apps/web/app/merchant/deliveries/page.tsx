"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck, CheckCircle2, MapPin, Calendar, Clock } from "lucide-react";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function MerchantDeliveriesHistoryPage() {
  const { data: subordersData, isLoading } = useQuery({
    queryKey: ["merchant-deliveries-history"],
    queryFn: async () => {
      const res = await api.get<any>("/merchants/suborders");
      const raw = res.data?.suborders || (Array.isArray(res.data) ? res.data : []);
      return raw.filter((s: any) => ["PICKED_UP", "DELIVERED"].includes(s.status));
    },
  });

  const deliveries = subordersData || [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Delivery Outflow History
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Trace every completed and in-transit suborder handed over to our Khammam fleet.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <Truck className="w-12 h-12 text-neutral-300 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">No dispatch history yet</h2>
          <p className="text-xs text-neutral-500">Orders handed over to delivery partners will be permanently audited here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs divide-y divide-neutral-100">
          {deliveries.map((d: any) => (
            <div
              key={d.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900">Suborder #{d.id.slice(0, 8)}</span>
                  <StatusBadge status={d.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    {d.delivery_locality || "Khammam Central"}
                  </span>
                  <span>{d.items?.length || 1} item(s)</span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6">
                <div className="text-right">
                  <span className="text-3xs uppercase text-neutral-400 font-extrabold block">Suborder Total</span>
                  <span className="text-sm font-black text-neutral-900">₹{Number(d.subtotal).toFixed(2)}</span>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 text-3xs font-bold">
                  {d.status === "DELIVERED" ? "POD Confirmed" : "En Route"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
