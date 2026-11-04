"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  MapPin, 
  Store, 
  Clock, 
  ArrowRight, 
  ShoppingBag, 
  Sparkles,
  ChevronRight
} from "lucide-react";
import { api } from "@/lib/api-client";
import { ShopCardSkeleton } from "@/components/ui/skeleton";

export default function CustomerExplorePage() {
  const [search, setSearch] = useState("");
  const [locality, setLocality] = useState("ALL");

  const { data: merchantsData, isLoading } = useQuery({
    queryKey: ["customer-explore-merchants", search, locality],
    queryFn: async () => {
      let url = "/merchants";
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (locality !== "ALL") params.append("locality", locality);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get<any>(url);
      return res.data?.merchants || [];
    },
  });

  const merchants = merchantsData || [];

  const localities = [
    { label: "All Sectors", value: "ALL" },
    { label: "Wyra Road Corridor", value: "Wyra Road" },
    { label: "Mamata Hospital Road", value: "Mamata Hospital Road" },
    { label: "Gandhi Chowk", value: "Gandhi Chowk" },
    { label: "Bypass Road", value: "Bypass Road" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Explore Khammam Shops
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Order from any store. Add items to your cart and our system will bundle compatible stops into one shared delivery.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search shops or dishes in Khammam..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 rounded-xl text-sm font-medium border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {localities.map((loc) => (
              <button
                key={loc.value}
                onClick={() => setLocality(loc.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
                  locality === loc.value
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

      {/* Merchants Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ShopCardSkeleton />
          <ShopCardSkeleton />
          <ShopCardSkeleton />
        </div>
      ) : merchants.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200">
          <Store className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-900">No stores found</h3>
          <p className="text-xs text-neutral-500 mt-1">Try another search term or sector.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {merchants.map((shop: any) => (
            <div
              key={shop.id}
              className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center font-bold text-lg">
                    <Store className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-3xs font-extrabold uppercase">
                    Open
                  </span>
                </div>

                <h3 className="text-lg font-bold text-neutral-900">{shop.name}</h3>
                <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="truncate">{shop.address || shop.locality || "Khammam Sector 01"}</span>
                </p>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
                  <span className="font-semibold text-teal-800">{shop.locality || "Wyra Road"}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    15–20 min prep
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100">
                <Link
                  href={`/shops/${shop.id}`}
                  className="w-full py-3 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <span>Browse Menu & Items</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
