"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { IndianRupee, TrendingUp, Sparkles, CheckCircle2, Bike } from "lucide-react";
import { api } from "@/lib/api-client";

export default function PartnerEarningsPage() {
  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ["partner-earnings-runs"],
    queryFn: async () => {
      const res = await api.get<any>("/partners/assignments");
      const raw = res.data?.assignments || (Array.isArray(res.data) ? res.data : []);
      return raw.filter((a: any) => a.status === "COMPLETED");
    },
  });

  const completed = assignmentsData || [];
  const totalEarnings = completed.length * 120; // Demo batch rate: ₹120 per multi-stop batch

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Earnings & Multi-Stop Incentives
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Transparent driver earnings with multi-stop batching bonuses.
        </p>
      </div>

      {/* Demo Terms Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>DEMO POLICY NOTICE:</strong> Pilot payout structure: Base trip pay ₹60 + ₹30 per additional merchant pickup + ₹30 per drop-off.
          </span>
        </div>
        <span className="text-3xs font-extrabold uppercase bg-amber-200/80 px-2 py-0.5 rounded text-amber-900">
          PILOT TERMS
        </span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-2">
          <span className="text-3xs uppercase font-extrabold text-neutral-400 tracking-wider">Completed Batches</span>
          <span className="text-3xl font-black text-neutral-950 block">{completed.length}</span>
          <span className="text-3xs text-neutral-500 block">Khammam Sector 01</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-2">
          <span className="text-3xs uppercase font-extrabold text-neutral-400 tracking-wider">Multi-Stop Efficiency Bonus</span>
          <span className="text-3xl font-black text-emerald-700 block">₹{completed.length * 60}</span>
          <span className="text-3xs text-emerald-800 font-bold block">+50% over single runs</span>
        </div>

        <div className="p-6 rounded-2xl bg-teal-950 text-white shadow-2xs space-y-2">
          <span className="text-3xs uppercase font-extrabold text-teal-400 tracking-wider">Total Driver Payout</span>
          <span className="text-3xl font-black text-white block">₹{totalEarnings}</span>
          <span className="text-3xs text-teal-300 block">Settled to UPI daily</span>
        </div>
      </div>

      {/* Breakdown per batch */}
      <div className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-neutral-950">Daily Payout Transactions</h2>

        {completed.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500">
            No completed batch runs recorded today. Complete runs to earn payouts.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {completed.map((c: any) => (
              <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-neutral-900 block">
                    Shared Batch #{c.batchCode || c.batch_code || c.batchId?.slice(0, 8) || c.id.slice(0, 8)}
                  </span>
                  <span className="text-3xs text-neutral-400">
                    {c.respondedAt || c.offeredAt || c.createdAt || c.created_at
                      ? new Date(c.respondedAt || c.offeredAt || c.createdAt || c.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
                      : "Today"} · POD Confirmed
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-emerald-700 text-sm block">₹120.00</span>
                  <span className="text-3xs text-neutral-500">Credited</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
