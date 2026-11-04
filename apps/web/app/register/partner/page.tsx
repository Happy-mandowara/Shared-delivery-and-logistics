"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Bike, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  IndianRupee, 
  Sparkles,
  PhoneCall,
  AlertCircle
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";

export default function RegisterPartnerPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    drivingLicense: "",
    vehicleType: "TWO_WHEELER",
    locality: "Wyra Road",
    hasSmartPhone: true
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/partners/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsSubmitted(true);
      } else {
        setErrorMessage(data.error?.message || "Failed to submit partner application. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while submitting your application.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* Title */}
        <div className="space-y-3">
          <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-bold uppercase tracking-wider inline-block">
            Delivery Fleet Application
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-950 tracking-tight">
            Join the Khammam Delivery Fleet
          </h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            Drive with NationX. With coordinated shared batches, earn significantly higher hourly income by delivering compatible stops on the same run.
          </p>
        </div>

        {isSubmitted ? (
          <div className="p-8 sm:p-10 rounded-3xl bg-white border border-neutral-200 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-neutral-950">Application Submitted!</h2>
            <p className="text-sm text-neutral-600 max-w-md mx-auto">
              Welcome, <strong>{formData.fullName}</strong>. Our Khammam fleet supervisor will contact you at <strong>{formData.phone}</strong> for document verification and helmet/kit handover.
            </p>
            <div className="pt-4 flex items-center justify-center gap-3">
              <Link
                href="/login"
                className="px-6 py-3 rounded-xl bg-[#0F766E] text-white text-xs font-bold min-h-[48px] inline-flex items-center"
              >
                Sign In to Partner Portal
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-6"
          >
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-[#B42318]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-900 block" htmlFor="fullName">
                  Full Name (as on Aadhaar/DL) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="fullName"
                  required
                  type="text"
                  placeholder="e.g. Venkatesh Rao"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[48px]"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-900 block" htmlFor="phone">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  id="phone"
                  required
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[48px]"
                />
              </div>

              {/* Driving License */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-900 block" htmlFor="drivingLicense">
                  Driving License (DL) Number <span className="text-rose-500">*</span>
                </label>
                <input
                  id="drivingLicense"
                  required
                  type="text"
                  placeholder="e.g. TS04 20210001234"
                  value={formData.drivingLicense}
                  onChange={(e) => setFormData({ ...formData, drivingLicense: e.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[48px]"
                />
              </div>

              {/* Vehicle Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-900 block" htmlFor="vehicleType">
                  Two-Wheeler Type <span className="text-rose-500">*</span>
                </label>
                <select
                  id="vehicleType"
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[48px]"
                >
                  <option value="Motorcycle / Geared Bike">Motorcycle / Geared Bike</option>
                  <option value="Scooter (Activa / Jupiter)">Scooter (Activa / Jupiter)</option>
                  <option value="Electric Scooter (EV)">Electric Scooter (EV)</option>
                </select>
              </div>

              {/* Locality */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-neutral-900 block" htmlFor="locality">
                  Preferred Delivery Sector <span className="text-rose-500">*</span>
                </label>
                <select
                  id="locality"
                  value={formData.locality}
                  onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[48px]"
                >
                  <option value="Wyra Road">Wyra Road Corridor & Clock Tower</option>
                  <option value="Mamata Hospital Road">Mamata Hospital Road & Rotary Nagar</option>
                  <option value="Gandhi Chowk">Gandhi Chowk & Market Yard</option>
                  <option value="Bypass Road">Bypass Road & Industrial Estate</option>
                </select>
              </div>
            </div>

            {/* Earnings Estimate Banner */}
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-[#0F766E] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4" />
                <span>Transparent Batch Payout Structure</span>
              </div>
              <p>
                Earn base pay plus additional payout for every combined pickup and drop-off in a batch. No deductions for app fees during the Khammam demonstration.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] disabled:bg-neutral-400 text-white text-sm font-extrabold shadow-sm transition-colors flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>{isLoading ? "Submitting Application..." : "Submit Fleet Application"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </PublicLayout>
  );
}
