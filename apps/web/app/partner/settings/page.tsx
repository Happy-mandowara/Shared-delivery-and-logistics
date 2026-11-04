"use client";

import React, { useState } from "react";
import { Settings, CheckCircle2, Volume2, Smartphone, ShieldCheck } from "lucide-react";

export default function PartnerSettingsPage() {
  const [loudChimes, setLoudChimes] = useState(true);
  const [keepAwake, setKeepAwake] = useState(true);
  const [vibrateAlerts, setVibrateAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Driver App Settings
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Tailor cockpit audio, screen behaviour, and alerts for safe two-wheeler operation.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-6">
        {saved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Driver preferences updated!</span>
          </div>
        )}

        <div className="space-y-5 divide-y divide-neutral-100">
          <div className="pt-4 first:pt-0 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-neutral-900 block">Loud Traffic Audio Alerts</span>
              <p className="text-xs text-neutral-500">Play amplified high-pitch chime for new batch offers audible over engine noise.</p>
            </div>
            <button
              onClick={() => setLoudChimes(!loudChimes)}
              className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center ${
                loudChimes ? "bg-[#0F766E] justify-end" : "bg-neutral-300 justify-start"
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          <div className="pt-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-neutral-900 block">Keep Screen Awake During Run</span>
              <p className="text-xs text-neutral-500">Prevent display timeout while navigating active delivery stops.</p>
            </div>
            <button
              onClick={() => setKeepAwake(!keepAwake)}
              className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center ${
                keepAwake ? "bg-[#0F766E] justify-end" : "bg-neutral-300 justify-start"
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          <div className="pt-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-neutral-900 block">Haptic Vibration on Stop Arrival</span>
              <p className="text-xs text-neutral-500">Vibrate phone when reaching store or customer destination coordinates.</p>
            </div>
            <button
              onClick={() => setVibrateAlerts(!vibrateAlerts)}
              className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center ${
                vibrateAlerts ? "bg-[#0F766E] justify-end" : "bg-neutral-300 justify-start"
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
