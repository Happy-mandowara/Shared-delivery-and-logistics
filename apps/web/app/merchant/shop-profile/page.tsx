"use client";

import React, { useState } from "react";
import { Store, MapPin, Clock, Phone, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/providers";

export default function MerchantShopProfilePage() {
  const { user } = useAuth();
  const [shopName, setShopName] = useState(user?.full_name || "Bawarchi Biryani Central");
  const [address, setAddress] = useState("Wyra Road, Beside Clock Tower, Khammam");
  const [locality, setLocality] = useState("Wyra Road Corridor");
  const [prepTime, setPrepTime] = useState(20);
  const [phone, setPhone] = useState("+91 8742 223456");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Shop Profile & Kitchen Timing
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Configure your physical storefront details and baseline preparation estimates.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-6">
        {/* Verification Card */}
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-neutral-900 block">{shopName}</span>
              <span className="text-xs text-neutral-500">Khammam Municipal Sector 01 Partner</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-3xs font-extrabold uppercase">
            Physically Verified
          </span>
        </div>

        {saved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile settings updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="sName">Shop Name</label>
              <input
                id="sName"
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="sPhone">Store Contact Hotline</label>
              <input
                id="sPhone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="sLoc">Pilot Sector</label>
              <input
                id="sLoc"
                type="text"
                disabled
                value={locality}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-500 text-xs cursor-not-allowed min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="sPrep">Default Preparation Minutes</label>
              <input
                id="sPrep"
                type="number"
                min="5"
                max="60"
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-900 block" htmlFor="sAddr">Street Address</label>
            <textarea
              id="sAddr"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold min-h-[44px]"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
