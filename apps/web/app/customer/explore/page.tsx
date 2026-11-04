"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  MapPin, 
  Store, 
  Clock, 
  ArrowRight, 
  Star, 
  Package, 
  Sparkles, 
  ShoppingBag, 
  Filter 
} from "lucide-react";
import { api } from "@/lib/api-client";
import { ShopCardSkeleton } from "@/components/ui/skeleton";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

function CustomerExploreContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "ALL";
  const initialSearch = searchParams.get("search") || "";

  const [search, setSearch] = useState(initialSearch);
  const [locality, setLocality] = useState("ALL");
  const [category, setCategory] = useState(initialCategory);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setCategory(cat);
    }
  }, [searchParams]);

  // Fetch live categories and localities
  const { data: categoriesData } = useQuery({
    queryKey: ["categories-meta"],
    queryFn: async () => {
      const res = await api.get<any>("/categories");
      return res.data || { merchantCategories: [], productCategories: [], localities: [] };
    },
    staleTime: 60000,
  });

  // Fetch merchants matching filters
  const { data: merchantsData, isLoading } = useQuery({
    queryKey: ["customer-explore-merchants", search, locality, category],
    queryFn: async () => {
      let url = "/merchants?limit=50";
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (locality !== "ALL") params.append("locality", locality);
      if (category !== "ALL") params.append("category", category);
      if (params.toString()) url += `&${params.toString()}`;

      const res = await api.get<any>(url);
      return res.data?.merchants || [];
    },
  });

  const merchants = merchantsData || [];
  const merchantCategories = categoriesData?.merchantCategories || [];
  const dbLocalities = categoriesData?.localities || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-bold">
          <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>Khammam Local Marketplace · Verified Stores</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Explore Khammam Shops
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Order from any store. Our logistics engine bundles compatible orders into one shared delivery batch to save fees and dispatch times.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
        {/* Search */}
        <div className="relative w-full">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search stores, categories, or items in Khammam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 rounded-xl text-sm font-medium border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCategory("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[40px] flex items-center gap-1.5 ${
              category === "ALL"
                ? "bg-neutral-900 text-white shadow-xs"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            <span>All Stores</span>
            <span className="text-3xs opacity-80 px-1.5 py-0.5 rounded-full bg-black/20 font-black">
              {merchants.length}
            </span>
          </button>

          {merchantCategories.map((cat: any) => (
            <button
              key={cat.name}
              onClick={() => setCategory(cat.name)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[40px] flex items-center gap-1.5 ${
                category === cat.name
                  ? "bg-[#0F766E] text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-3xs opacity-80 px-1.5 py-0.5 rounded-full bg-black/20 font-black">
                {cat.merchantCount}
              </span>
            </button>
          ))}
        </div>

        {/* Localities Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-neutral-100 pt-2.5">
          <span className="text-3xs font-extrabold uppercase tracking-wider text-neutral-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Area:
          </span>

          <button
            onClick={() => setLocality("ALL")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors min-h-[36px] ${
              locality === "ALL"
                ? "bg-teal-100 text-[#0F766E] font-bold"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            All Areas
          </button>

          {dbLocalities.map((loc: any) => (
            <button
              key={loc.name}
              onClick={() => setLocality(loc.name)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors min-h-[36px] ${
                locality === loc.name
                  ? "bg-teal-100 text-[#0F766E] font-bold"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {loc.name} ({loc.merchantCount})
            </button>
          ))}
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
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <Store className="w-12 h-12 text-neutral-300 mx-auto" />
          <h3 className="text-base font-bold text-neutral-900">No stores found</h3>
          <p className="text-xs text-neutral-500">
            No stores matched "{search || category}". Try adjusting your filters or search query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {merchants.map((shop: any) => (
            <div
              key={shop.id}
              className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-14 h-14 rounded-xl bg-teal-50 border border-teal-200 overflow-hidden shrink-0 relative">
                    <ImageWithFallback
                      src={shop.logoUrl || shop.logo_url}
                      alt={shop.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-3xs font-extrabold uppercase">
                      Open
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-neutral-800">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{shop.rating ? Number(shop.rating).toFixed(1) : "4.8"}</span>
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-neutral-950 line-clamp-1">{shop.name}</h3>
                
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-3xs font-semibold bg-neutral-100 text-neutral-700">
                  {shop.category || "General Store"}
                </span>

                <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="truncate">{shop.address || shop.locality || "Khammam Sector 01"}</span>
                </p>

                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
                  <span className="font-semibold text-teal-800">{shop.locality || "Khammam"}</span>
                  <span className="flex items-center gap-1 text-neutral-500">
                    <Package className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{shop.productCount || 0} Items</span>
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-neutral-100">
                <Link
                  href={`/shops/${shop.id}`}
                  className="w-full py-3 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 min-h-[48px] shadow-xs"
                >
                  <span>Browse Store & Menu</span>
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

export default function CustomerExplorePage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-20 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ShopCardSkeleton />
          <ShopCardSkeleton />
          <ShopCardSkeleton />
        </div>
      </div>
    }>
      <CustomerExploreContent />
    </Suspense>
  );
}
