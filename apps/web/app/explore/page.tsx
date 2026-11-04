"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  MapPin, 
  Store, 
  SlidersHorizontal, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ShoppingBag,
  Sparkles,
  PhoneCall
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { api } from "@/lib/api-client";
import { ShopCardSkeleton } from "@/components/ui/skeleton";

export default function ExploreShopsPage() {
  const [search, setSearch] = useState("");
  const [selectedLocality, setSelectedLocality] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const { data: merchantsData, isLoading } = useQuery({
    queryKey: ["explore-merchants", search, selectedLocality],
    queryFn: async () => {
      let url = "/merchants";
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedLocality !== "ALL") params.append("locality", selectedLocality);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get<any>(url);
      return res.data?.merchants || [];
    },
  });

  const merchants = merchantsData || [];

  const localities = [
    { label: "All Sectors", value: "ALL" },
    { label: "Wyra Road", value: "Wyra Road" },
    { label: "Mamata Hospital Road", value: "Mamata Hospital Road" },
    { label: "Gandhi Chowk", value: "Gandhi Chowk" },
    { label: "Bypass Road", value: "Bypass Road" },
  ];

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header Breadcrumbs & Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-bold">
            <MapPin className="w-3.5 h-3.5" />
            <span>Khammam Municipal Region · Verified Local Partners</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-950 tracking-tight">
            Explore Verified Khammam Shops
          </h1>
          <p className="text-neutral-600 text-sm max-w-2xl">
            Browse genuine local stores. Combine items from different shops in the same neighbourhood into a single shared delivery.
          </p>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by store name, address, or cuisine..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-neutral-50 rounded-xl text-sm font-medium border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:bg-white transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full">
                {localities.map((loc) => (
                  <button
                    key={loc.value}
                    onClick={() => setSelectedLocality(loc.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
                      selectedLocality === loc.value
                        ? "bg-[#0F766E] text-white"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {loc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Merchants Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <ShopCardSkeleton />
            <ShopCardSkeleton />
            <ShopCardSkeleton />
          </div>
        ) : merchants.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200">
            <Store className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-neutral-900">No shops found</h3>
            <p className="text-sm text-neutral-500 mt-1">Try clearing your search query or selecting &quot;All Sectors&quot;.</p>
            <button
              onClick={() => { setSearch(""); setSelectedLocality("ALL"); }}
              className="mt-4 px-4 py-2 rounded-xl bg-[#0F766E] text-white text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {merchants.map((shop: any) => (
              <div
                key={shop.id}
                className="bg-white rounded-2xl border border-neutral-200 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Shop Cover Photo or Graphic */}
                {shop.cover_url ? (
                  <div className="w-full h-32 bg-neutral-100 overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shop.cover_url} alt={shop.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-16 bg-gradient-to-r from-teal-50 to-teal-100/50" />
                )}

                <div className="p-6 pt-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-teal-200 text-[#0F766E] flex items-center justify-center font-bold text-lg shadow-2xs overflow-hidden shrink-0 -mt-8 relative z-10">
                      {shop.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6" />
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-3xs font-extrabold uppercase">
                      Open for Orders
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-neutral-900">{shop.name}</h3>
                    {shop.rating && (
                      <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        ★ {Number(shop.rating).toFixed(1)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">{shop.address || shop.locality || "Khammam Sector 01"}</span>
                  </p>

                  <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
                    <span className="font-semibold text-teal-800">{shop.locality || "Wyra Road Corridor"}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      15–20 mins prep
                    </span>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-0">
                  <Link
                    href={`/shops/${shop.id}`}
                    className="w-full py-3 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    <span>View Storefront</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
