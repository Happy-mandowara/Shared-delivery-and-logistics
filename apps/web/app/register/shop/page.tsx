"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Store, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  AlertCircle,
  Sparkles
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";

export default function RegisterShopPage() {
  const [formData, setFormData] = useState({
    shopName: "",
    ownerName: "",
    phone: "",
    locality: "Wyra Road",
    address: "",
    category: "Restaurants",
    preparationTimeMinutes: 20
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* Title */}
        <div className="space-y-3">
          <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-bold uppercase tracking-wider inline-block">
            Merchant Partner Application
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-950 tracking-tight">
            Register Your Khammam Shop
          </h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            Join the NationX shared delivery network. Reach neighbourhood customers without exorbitant aggregator commissions.
          </p>
        </div>

        {isSubmitted ? (
          <div className="p-8 sm:p-10 rounded-3xl bg-white border border-neutral-200 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-neutral-950">Application Received!</h2>
            <p className="text-sm text-neutral-600 max-w-md mx-auto">
              Thank you, <strong>{formData.ownerName}</strong>. Our Khammam operations team will visit <strong>{formData.shopName}</strong> on {formData.locality} within 24 hours for physical verification.
            </p>
            <div className="pt-4 flex items-center justify-center gap-3">
              <Link
                href="/login"
                className="px-6 py-3 rounded-xl bg-[#0F766E] text-white text-xs font-bold min-h-[48px] inline-flex items-center"
              >
                Go to Sign In
              </Link>
              <button
                onClick={() => setIsSubmitted(false)}
                className="px-6 py-3 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-bold min-h-[48px]"
              >
                Submit Another Outlet
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Shop Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-900 block" htmlFor="shopName">
                  Shop / Outlet Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="shopName"
                  required
                  type="text"
                  placeholder="e.g. Balaji Sweets & Bakery"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[48px]"
                />
              </div>

              {/* Owner Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-900 block" htmlFor="ownerName">
                  Owner / Proprietor Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="ownerName"
                  required
                  type="text"
                  placeholder="e.g. Ramesh Reddy"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[48px]"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-900 block" htmlFor="phone">
                  Contact Phone Number <span className="text-rose-500">*</span>
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

              {/* Locality */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-900 block" htmlFor="locality">
                  Khammam Pilot Locality <span className="text-rose-500">*</span>
                </label>
                <select
                  id="locality"
                  value={formData.locality}
                  onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[48px]"
                >
                  <option value="Wyra Road">Wyra Road Corridor</option>
                  <option value="Mamata Hospital Road">Mamata Hospital Road</option>
                  <option value="Gandhi Chowk">Gandhi Chowk / Old City</option>
                  <option value="Bypass Road">Bypass Road</option>
                  <option value="Railway Station Area">Railway Station Area</option>
                </select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-900 block" htmlFor="category">
                  Primary Category <span className="text-rose-500">*</span>
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[48px]"
                >
                  <option value="Restaurants">Hot Food & Restaurant</option>
                  <option value="Groceries">Kirana & Supermarket</option>
                  <option value="Dairy">Dairy & Milk Parlour</option>
                  <option value="Produce">Fresh Fruits & Vegetables</option>
                  <option value="Pharmacy">Pharmacy & Medical Supplies</option>
                  <option value="Sweets">Sweets & Snacks</option>
                </select>
              </div>

              {/* Typical Prep Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-900 block" htmlFor="prepTime">
                  Average Order Prep Time (Minutes)
                </label>
                <input
                  id="prepTime"
                  type="number"
                  min="5"
                  max="60"
                  value={formData.preparationTimeMinutes}
                  onChange={(e) => setFormData({ ...formData, preparationTimeMinutes: Number(e.target.value) })}
                  className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[48px]"
                />
              </div>
            </div>

            {/* Street Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="address">
                Full Physical Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="address"
                required
                rows={2}
                placeholder="Door No, Landmark, Street Name, Khammam"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-3 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>

            {/* Pilot Disclaimer */}
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-[#0F766E] space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Khammam Pilot Launch Terms</span>
              </div>
              <p>
                Zero listing fees during the pilot period. You retain 100% of your retail sales. Payouts are reconciled daily via direct bank transfer.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-sm font-extrabold shadow-sm transition-colors flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>Submit Merchant Registration</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </PublicLayout>
  );
}
