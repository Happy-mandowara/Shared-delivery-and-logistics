"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, IndianRupee, Sparkles, CheckCircle2, ShieldCheck, Download } from "lucide-react";
import { api } from "@/lib/api-client";

export default function AdminSettlementsPage() {
  const { data: batchesData } = useQuery({
    queryKey: ["admin-settlements-batches"],
    queryFn: async () => {
      const res = await api.get<any>("/batches");
      return (res.data?.batches || []).filter((b: any) => b.status === "COMPLETED");
    },
  });

  const completedBatches = batchesData || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Settlements & Financial Ledgers
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Reconciled merchant suborder sales and delivery partner compensation records.
        </p>
      </div>

      {/* Demo Terms Disclaimer */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>DEMO POLICY NOTICE:</strong> Settlement ledger parameters are active in pilot demonstration mode. 100% merchant retention, ₹120 per multi-stop batch for riders.
          </span>
        </div>
        <span className="text-3xs font-extrabold uppercase bg-amber-200/80 px-2 py-0.5 rounded text-amber-900">
          PILOT RECONCILIATION
        </span>
      </div>

      <div className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-950">Fulfilled Batches Settlement Queue</h2>
          <span className="text-xs text-neutral-500 font-semibold">{completedBatches.length} settled runs</span>
        </div>

        {completedBatches.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500">
            No completed batches to settle yet. Completed batches will appear here for banking export.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden">
            {completedBatches.map((b: any) => (
              <div key={b.id} className="p-4 bg-white flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-neutral-900 block">
                    Batch Run #{b.id.slice(0, 8)}
                  </span>
                  <span className="text-3xs text-neutral-500">
                    Partner: {b.partner_id?.slice(0, 8) || "Assigned"} · Locality: {b.locality || "Wyra Road"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-neutral-900 text-sm block">₹120.00 Rider Pay</span>
                  <span className="text-3xs text-emerald-700 font-bold">Reconciled to Ledger</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

