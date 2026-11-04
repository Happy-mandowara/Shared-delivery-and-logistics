"use client";

import React, { useState } from "react";
import { Settings, ShieldCheck, CheckCircle2, Clock, Layers, Sparkles } from "lucide-react";

export default function AdminSettingsPage() {
  const [maxWaitMinutes, setMaxWaitMinutes] = useState(15);
  const [maxOrdersPerBatch, setMaxOrdersPerBatch] = useState(8);
  const [defaultCapacity, setDefaultCapacity] = useState(10);
  const [pilotMode, setPilotMode] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          System Parameters & Dispatch Policies
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Configure algorithmic limits, cutoffs, and pilot guardrails for Khammam operations.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-6">
        {saved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>System parameters successfully updated!</span>
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

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-900 block">
              Max Dispatch Holding Window (Minutes)
            </label>
            <input
              type="number"
              min="5"
              max="30"
              value={maxWaitMinutes}
              onChange={(e) => setMaxWaitMinutes(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
            />
            <span className="text-3xs text-neutral-400 block">
              Hard ceiling before single ready order is forced to dispatch.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block">
                Max Orders Allowed in Batch
              </label>
              <input
                type="number"
                min="2"
                max="12"
                value={maxOrdersPerBatch}
                onChange={(e) => setMaxOrdersPerBatch(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block">
                Two-Wheeler Capacity Standard (Units)
              </label>
              <input
                type="number"
                min="2"
                max="20"
                value={defaultCapacity}
                onChange={(e) => setDefaultCapacity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-neutral-900 block">Khammam Sector 01 Pilot Mode</span>
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
            Save System Policies
          </button>
        </div>
      </div>
    </div>
  );
}

