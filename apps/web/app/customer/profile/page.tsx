"use client";

import React, { useState } from "react";
import { User, Mail, Phone, MapPin, ShieldCheck, CheckCircle2, LogOut } from "lucide-react";
import { useAuth } from "@/components/providers";
import { useRouter } from "next/navigation";

export default function CustomerProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState(user?.full_name || "Srinivas K.");
  const [phone, setPhone] = useState(user?.phone || "+91 94900 12345");
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
          Account Profile
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Manage your personal details and contact information for Khammam deliveries.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-6">
        {/* User Identity Chip */}
        <div className="flex items-center gap-4 pb-6 border-b border-neutral-100">
          <div className="w-16 h-16 rounded-2xl bg-teal-100 text-[#0F766E] flex items-center justify-center font-black text-2xl">
            {fullName.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">{fullName}</h2>
            <span className="text-xs text-neutral-500 block">{user?.email || "customer@nationx.in"}</span>
            <span className="inline-block mt-1 px-2 py-0.5 rounded text-3xs font-bold uppercase bg-teal-50 text-[#0F766E]">
              Role: Customer
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block" htmlFor="profName">Full Name</label>
            <input
              id="profName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block" htmlFor="profEmail">Email Address</label>
            <input
              id="profEmail"
              type="email"
              disabled
              value={user?.email || "customer@nationx.in"}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-100 text-neutral-500 text-xs cursor-not-allowed min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block" htmlFor="profPhone">Mobile Number (For Delivery SMS)</label>
            <input
              id="profPhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
            />
          </div>

          {saved && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Profile details saved successfully!</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors min-h-[44px]"
            >
              Update Profile
            </button>
            <button
              type="button"
              onClick={() => { logout(); router.push("/login"); }}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-xs font-bold text-rose-600 transition-colors min-h-[44px] flex items-center gap-1.5"
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
