"use client";

import React, { useState } from "react";
import { Settings, ShieldCheck, CheckCircle2, Bell, Printer, Power } from "lucide-react";

export default function MerchantSettingsPage() {
  const [autoAccept, setAutoAccept] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [storeOpen, setStoreOpen] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Store Operations Settings
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Configure operational preferences, alert sounds, and ordering controls.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-6">
        {saved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Operational settings saved!</span>
          </div>
        )}

        <div className="space-y-5 divide-y divide-neutral-100">
          {/* Store Availability Toggle */}
          <div className="pt-4 first:pt-0 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-neutral-900 block">Accepting Orders Online</span>
              <p className="text-xs text-neutral-500">Toggle off to temporarily pause new customer orders during rush hours.</p>
            </div>
            <button
              onClick={() => setStoreOpen(!storeOpen)}
              className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center ${
                storeOpen ? "bg-[#0F766E] justify-end" : "bg-neutral-300 justify-start"
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {/* Sound Alerts */}
          <div className="pt-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-neutral-900 block">Kitchen Sound Alert</span>
              <p className="text-xs text-neutral-500">Play an audible chime when a new suborder arrives.</p>
            </div>
            <button
              onClick={() => setSoundAlerts(!soundAlerts)}
              className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center ${
                soundAlerts ? "bg-[#0F766E] justify-end" : "bg-neutral-300 justify-start"
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {/* Auto Accept */}
          <div className="pt-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-neutral-900 block">Auto-Accept Suborders</span>
              <p className="text-xs text-neutral-500">Automatically move incoming orders to kitchen prep with default 20-min timer.</p>
            </div>
            <button
              onClick={() => setAutoAccept(!autoAccept)}
              className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center ${
                autoAccept ? "bg-[#0F766E] justify-end" : "bg-neutral-300 justify-start"
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
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
