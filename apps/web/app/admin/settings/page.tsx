"use client";

import React, { useState } from "react";
import { Settings, ShieldCheck, CheckCircle2, Clock, Layers, Sparkles, DollarSign, Percent, Bike, Store } from "lucide-react";

export default function AdminSettingsPage() {
  const [maxWaitMinutes, setMaxWaitMinutes] = useState(15);
  const [maxOrdersPerBatch, setMaxOrdersPerBatch] = useState(8);
  const [defaultCapacity, setDefaultCapacity] = useState(10);
  const [pilotMode, setPilotMode] = useState(true);

  // Commercial model parameters (DEMO POLICY)
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(25);
  const [multiShopSurcharge, setMultiShopSurcharge] = useState(15);
  const [perKmTransitRate, setPerKmTransitRate] = useState(6);
  const [merchantCommissionPct, setMerchantCommissionPct] = useState(5.0);
  const [partnerBasePayout, setPartnerBasePayout] = useState(45);
  const [partnerPerStopPayout, setPartnerPerStopPayout] = useState(20);

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          System Parameters & Commercial Model
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Configure algorithmic dispatch limits, batch cutoffs, and transparent corridor delivery charges.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-6">
        {saved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Operational policies and commercial rates successfully updated!</span>
          </div>
        )}

        {/* Rule 4 Callout */}
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-[#0F766E] space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Project 03 Non-Negotiable Rule 4 Protection</span>
          </div>
          <p className="text-neutral-700 text-3xs leading-relaxed">
            Never hold a ready order to increase batch size. If waiting for another candidate order risks the dispatch deadline of a ready order, dispatch it immediately.
          </p>
        </div>

        {/* Commercial Model Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#0F766E]" />
              <span>Commercial Pricing & Corridor Charges (DEMO POLICY)</span>
            </span>
            <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              Demo Policy
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block">
                Base Corridor Fee (₹)
              </label>
              <input
                type="number"
                value={baseDeliveryFee}
                onChange={(e) => setBaseDeliveryFee(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
              <span className="text-3xs text-neutral-400">Fixed rate for first 2 km within corridor</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block">
                Multi-Shop Pickup Fee (₹)
              </label>
              <input
                type="number"
                value={multiShopSurcharge}
                onChange={(e) => setMultiShopSurcharge(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
              <span className="text-3xs text-neutral-400">Added per each additional merchant visited</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block">
                Transit Rate (₹ / km)
              </label>
              <input
                type="number"
                value={perKmTransitRate}
                onChange={(e) => setPerKmTransitRate(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
              <span className="text-3xs text-neutral-400">Incremental charge beyond 2 km distance</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block">
                Merchant Commission (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={merchantCommissionPct}
                  onChange={(e) => setMerchantCommissionPct(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                />
                <Percent className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              </div>
              <span className="text-3xs text-neutral-400">Compare with 25-30% on traditional apps</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block">
                Partner Base Payout (₹)
              </label>
              <input
                type="number"
                value={partnerBasePayout}
                onChange={(e) => setPartnerBasePayout(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
              <span className="text-3xs text-neutral-400">Guaranteed trip base compensation</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block">
                Partner Per-Stop Payout (₹)
              </label>
              <input
                type="number"
                value={partnerPerStopPayout}
                onChange={(e) => setPartnerPerStopPayout(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
              <span className="text-3xs text-neutral-400">Added per physical pickup & drop-off stop</span>
            </div>
          </div>
        </div>

        {/* Dispatch Policies */}
        <div className="space-y-4 pt-4 border-t border-neutral-100">
          <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider block">
            Algorithmic Dispatch Constraints
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block">
                Max Dispatch Window (Mins)
              </label>
              <input
                type="number"
                min="5"
                max="30"
                value={maxWaitMinutes}
                onChange={(e) => setMaxWaitMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
              <span className="text-3xs text-neutral-400">Hard cutoff for single ready orders</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block">
                Max Orders Per Batch
              </label>
              <input
                type="number"
                min="2"
                max="12"
                value={maxOrdersPerBatch}
                onChange={(e) => setMaxOrdersPerBatch(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
              <span className="text-3xs text-neutral-400">Upper limit for 2-wheeler cargo load</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block">
                Vehicle Capacity Standard (Units)
              </label>
              <input
                type="number"
                min="2"
                max="20"
                value={defaultCapacity}
                onChange={(e) => setDefaultCapacity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
              <span className="text-3xs text-neutral-400">Volume weight capacity score</span>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-neutral-900 block">Khammam Sector 01 Special Rate Mode</span>
              <span className="text-3xs text-neutral-400">Shows DEMO badges and maintains zero merchant fees.</span>
            </div>

            <button
              onClick={() => setPilotMode(!pilotMode)}
              className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center ${
                pilotMode ? "bg-[#0F766E] justify-end" : "bg-neutral-300 justify-start"
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-white shadow-xs" />
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-100 flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors min-h-[44px]"
          >
            Save System Policies & Commercial Rates
          </button>
        </div>
      </div>
    </div>
  );
}
