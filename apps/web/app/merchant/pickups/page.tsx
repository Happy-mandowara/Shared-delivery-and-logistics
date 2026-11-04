"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Truck, CheckCircle2, AlertCircle, PackageCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function MerchantPickupsPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: subordersData, isLoading } = useQuery({
    queryKey: ["merchant-pickups-list"],
    queryFn: async () => {
      const res = await api.get<any>("/merchants/suborders");
      const raw = res.data?.suborders || (Array.isArray(res.data) ? res.data : []);
      return raw.filter((s: any) => s.status === "READY_FOR_PICKUP");
    },
    refetchInterval: 5000,
  });

  const stagedOrders = subordersData || [];

  const handoverMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/merchants/suborders/${id}/handover`, {});
    },
    onSuccess: () => {
      setSuccessMsg("Package handover recorded! Rider is en route to customer.");
      queryClient.invalidateQueries({ queryKey: ["merchant-pickups-list"] });
      setTimeout(() => setSuccessMsg(null), 3000);
    },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Staged Pickups
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Packed orders ready at the storefront awaiting handover to the assigned delivery partner.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : stagedOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <PackageCheck className="w-12 h-12 text-neutral-300 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">No staged packages right now</h2>
          <p className="text-xs text-neutral-500">Orders marked &quot;Ready for Pickup&quot; in the kitchen queue will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {stagedOrders.map((so: any) => (
            <div
              key={so.id}
              className="p-6 rounded-2xl bg-white border border-teal-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-neutral-900">Suborder #{so.id.slice(0, 8)}</span>
                  <StatusBadge status={so.status} />
                </div>
                <span className="text-xs text-neutral-500 block">
                  {so.items?.length || 1} item(s) packed · Total: ₹{Number(so.subtotal).toFixed(2)}
                </span>
                <span className="text-3xs text-teal-800 font-bold block">
                  Delivery Destination: {so.delivery_locality || "Khammam Sector 01"}
                </span>
              </div>

              <button
                onClick={() => handoverMutation.mutate(so.id)}
                disabled={handoverMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors min-h-[44px] flex items-center gap-2 shadow-xs shrink-0"
              >
                <Truck className="w-4 h-4" />
                <span>Confirm Handover to Partner</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
