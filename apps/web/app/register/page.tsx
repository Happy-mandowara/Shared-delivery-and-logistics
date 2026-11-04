"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Phone, ArrowRight, CheckCircle2, AlertCircle, Store, Truck } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"CUSTOMER" | "MERCHANT" | "PARTNER">("CUSTOMER");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [registered, setRegistered] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "MERCHANT") {
      router.push("/register/shop");
      return;
    }
    if (role === "PARTNER") {
      router.push("/register/partner");
      return;
    }
    setRegistered(true);
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0F766E] text-white font-black text-2xl shadow-md mb-1">
            NX
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Create an Account
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Join the NationX shared logistics platform in Khammam.
          </p>
        </div>

        {registered ? (
          <div className="p-8 rounded-3xl bg-white border border-neutral-200 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-neutral-950">Registration Complete!</h2>
            <p className="text-xs text-neutral-600">
              Welcome to NationX, <strong>{fullName}</strong>. You can now sign in to explore Khammam stores.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0F766E] text-white text-xs font-bold min-h-[48px]"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-4"
          >
            {/* Role Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">I want to join as</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Customer", value: "CUSTOMER" },
                  { label: "Shop", value: "MERCHANT" },
                  { label: "Rider", value: "PARTNER" },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value as any)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                      role === r.value
                        ? "bg-[#0F766E] text-white shadow-xs"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block" htmlFor="regName">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="regName"
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block" htmlFor="regEmail">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                id="regEmail"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block" htmlFor="regPhone">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="regPhone"
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block" htmlFor="regPass">
                Password <span className="text-rose-500">*</span>
              </label>
              <input
                id="regPass"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-black shadow-sm transition-colors flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>{role === "CUSTOMER" ? "Create Customer Account" : `Continue to ${role} Onboarding`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center text-xs text-neutral-500">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-[#0F766E] hover:underline">
                Sign in here
              </Link>
            </div>
          </form>
        )}
      </div>
    </PublicLayout>
  );
}

