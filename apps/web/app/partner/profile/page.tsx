"use client";

import React, { useState } from "react";
import { User, Bike, ShieldCheck, CheckCircle2, Phone, MapPin, LogOut } from "lucide-react";
import { useAuth } from "@/components/providers";
import { useRouter } from "next/navigation";

export default function PartnerProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState(user?.full_name || "Venkatesh Rao");
  const [phone, setPhone] = useState(user?.phone || "+91 98765 43210");
  const [vehicle, setVehicle] = useState("Hero Splendor (TS04 EA 1234)");
  const [license, setLicense] = useState("TS04 20210005432");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Delivery Partner Profile
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Your registered rider credentials, vehicle details, and hub assignment in Khammam.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-neutral-100">
          <div className="w-16 h-16 rounded-2xl bg-teal-100 text-[#0F766E] flex items-center justify-center font-black text-2xl">
            {fullName.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">{fullName}</h2>
            <span className="text-xs text-neutral-500 block">Khammam Fleet · Sector 01 Partner</span>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-3xs font-bold uppercase bg-emerald-50 text-emerald-800">
              Active Driver Verified
            </span>
          </div>
        </div>

        {saved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile details updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-900 block" htmlFor="rName">Full Name</label>
            <input
              id="rName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="rPhone">Mobile Number</label>
              <input
                id="rPhone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="rLic">Driving License</label>
              <input
                id="rLic"
                type="text"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-900 block" htmlFor="rVeh">Registered Vehicle & Registration No.</label>
            <input
              id="rVeh"
              type="text"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold min-h-[44px]"
            >
              Save Profile Changes
            </button>
            <button
              type="button"
              onClick={() => { logout(); router.push("/login"); }}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-xs font-bold text-rose-600 min-h-[44px] flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
