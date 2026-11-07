"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { IndianRupee, TrendingUp, Sparkles, ShieldCheck, ArrowDownRight, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";

export default function MerchantEarningsPage() {
  const { data: subordersData, isLoading } = useQuery({
    queryKey: ["merchant-earnings-list"],
    queryFn: async () => {
      const res = await api.get<any>("/merchants/suborders");
      return res.data?.suborders || (Array.isArray(res.data) ? res.data : []);
    },
  });

  const suborders = subordersData || [];
  const completedOrders = suborders.filter((s: any) => ["PICKED_UP", "DELIVERED"].includes(s.status));
  const grossSales = completedOrders.reduce((sum: number, s: any) => sum + (Number(s.subtotal) || 0), 0);
  const netEarnings = grossSales; // Zero platform commission

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Merchant Earnings & Settlements
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Financial reconciliation and daily bank transfer records for Khammam store operations.
        </p>
      </div>

      {/* Demo Policy Disclaimer */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>DEMO POLICY NOTICE:</strong> Zero platform commission active during the Khammam trial period. Merchants retain 100% of suborder sales.
          </span>
        </div>
        <span className="text-3xs font-extrabold uppercase bg-amber-200/80 px-2 py-0.5 rounded text-amber-900">
          DEMO POLICY
        </span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-2">
          <span className="text-3xs uppercase font-extrabold text-neutral-400 tracking-wider">Gross Sales</span>
          <span className="text-3xl font-black text-neutral-950 block">₹{grossSales.toFixed(2)}</span>
          <span className="text-3xs text-neutral-500 block">From {completedOrders.length} fulfilled suborders</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-2">
          <span className="text-3xs uppercase font-extrabold text-neutral-400 tracking-wider">Platform Deductions</span>
          <span className="text-3xl font-black text-emerald-700 block">₹0.00</span>
          <span className="text-3xs text-emerald-800 font-bold block">100% retail retention</span>
        </div>

        <div className="p-6 rounded-2xl bg-teal-950 text-white shadow-2xs space-y-2">
          <span className="text-3xs uppercase font-extrabold text-teal-400 tracking-wider">Net Settlement Balance</span>
          <span className="text-3xl font-black text-white block">₹{netEarnings.toFixed(2)}</span>
          <span className="text-3xs text-teal-300 block">Next payout: Midnight IST</span>
        </div>
      </div>

      {/* Settlement Records */}
      <div className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-neutral-950">Settlement Ledger</h2>

        {completedOrders.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500">
            No completed sales to reconcile yet. Complete customer deliveries to see payout transactions.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {completedOrders.map((s: any) => (
              <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-neutral-900 block">Suborder #{s.id.slice(0, 8)}</span>
                  <span className="text-3xs text-neutral-400">
                    {new Date(s.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} · Handed over
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-neutral-900 block">₹{Number(s.subtotal).toFixed(2)}</span>
                  <span className="text-3xs font-bold text-emerald-700">Ready for Bank Transfer</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
