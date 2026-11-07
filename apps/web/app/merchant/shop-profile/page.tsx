"use client";

import React, { useState, useEffect } from "react";
import { Store, MapPin, Clock, Phone, ShieldCheck, CheckCircle2, AlertCircle, Camera } from "lucide-react";
import { useAuth } from "@/components/providers";
import { api } from "@/lib/api-client";
import { ImageUploader } from "@/components/ui/image-uploader";

export default function MerchantShopProfilePage() {
  const { user } = useAuth();
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [locality, setLocality] = useState("Wyra Road Corridor");
  const [prepTime, setPrepTime] = useState(20);
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get<any>("/merchants/me");
        if (res.data?.merchant) {
          const m = res.data.merchant;
          setShopName(m.name || "");
          setAddress(m.address || "");
          setLocality(m.locality || "Wyra Road Corridor");
          setPhone(m.contactPhone || m.contact_phone || "");
          setLogoUrl(m.logoUrl || m.logo_url || "");
          setCoverUrl(m.coverUrl || m.cover_url || "");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load store profile");
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await api.patch<any>("/merchants/me", {
        name: shopName,
        address,
        locality,
        contactPhone: phone,
        logoUrl,
        coverUrl,
      });
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(res.error?.message || "Failed to update profile");
      }
    } catch (err: any) {
      setError(err.message || "Error saving store profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-neutral-200 rounded-xl w-64" />
        <div className="h-64 bg-white rounded-3xl border border-neutral-200" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Shop Profile & Storefront Branding
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Configure your physical storefront details, photograph, and baseline preparation estimates.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-6">
        {/* Verification Card */}
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-teal-200 text-[#0F766E] flex items-center justify-center font-bold overflow-hidden shrink-0 shadow-xs">
              {logoUrl ? (
                <img src={logoUrl} alt={shopName} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-6 h-6" />
              )}
            </div>
            <div>
              <span className="text-sm font-bold text-neutral-900 block">{shopName || "Store Name"}</span>
              <span className="text-xs text-neutral-500">Khammam Municipal Commercial Hub</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-3xs font-extrabold uppercase shrink-0">
            Physically Verified
          </span>
        </div>

        {saved && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Profile settings and shop image updated successfully!</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Store Photograph Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-900 block">
              Storefront Photograph & Logo
            </label>
            <p className="text-3xs text-neutral-500">
              Upload your shop exterior or branding mark. Displays on customer search, order receipts, and dashboard header.
            </p>
            <ImageUploader
              value={logoUrl ? [logoUrl] : []}
              onChange={(urls) => {
                const u = Array.isArray(urls) ? urls[0] : urls;
                setLogoUrl(u || "");
              }}
              multiple={false}
              maxFiles={1}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="sName">Shop Name</label>
              <input
                id="sName"
                type="text"
                required
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
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="sLoc">Commercial Corridor</label>
              <input
                id="sLoc"
                type="text"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
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
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] disabled:bg-neutral-400 text-white text-xs font-bold min-h-[48px] shadow-xs"
            >
              {isSaving ? "Saving..." : "Save Profile Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
