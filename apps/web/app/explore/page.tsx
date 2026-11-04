"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  MapPin, 
  Store, 
  ArrowRight, 
  Star,
  Package,
  Filter
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { api } from "@/lib/api-client";
import { ShopCardSkeleton } from "@/components/ui/skeleton";

export default function ExploreShopsPage() {
  const [search, setSearch] = useState("");
  const [selectedLocality, setSelectedLocality] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Fetch dynamic categories and localities
  const { data: categoriesData } = useQuery({
    queryKey: ["public-categories-meta"],
    queryFn: async () => {
      const res = await api.get<any>("/categories");
      return res.data || { merchantCategories: [], productCategories: [], localities: [] };
    },
    staleTime: 60000,
  });

  const { data: merchantsData, isLoading } = useQuery({
    queryKey: ["explore-merchants", search, selectedLocality, selectedCategory],
    queryFn: async () => {
      let url = "/merchants?limit=50";
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (selectedLocality !== "ALL") params.append("locality", selectedLocality);
      if (selectedCategory !== "ALL") params.append("category", selectedCategory);
      if (params.toString()) url += `&${params.toString()}`;

      const res = await api.get<any>(url);
      return res.data?.merchants || [];
    },
  });

  const merchants = merchantsData || [];
  const merchantCategories = categoriesData?.merchantCategories || [];
  const localities = categoriesData?.localities || [];

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
            Local Merchants & Outlets
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 max-w-2xl">
            Discover verified Khammam restaurants, grocers, sweet shops and pharmacies. Add items from multiple shops in one order with single-batch shared delivery.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
          <div className="relative w-full">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search shops or categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 rounded-xl text-sm font-medium border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
            />
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[40px] flex items-center gap-1.5 ${
                selectedCategory === "ALL"
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
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[40px] flex items-center gap-1.5 ${
                  selectedCategory === cat.name
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

          {/* Localities */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-neutral-100 pt-2.5">
            <span className="text-3xs font-extrabold uppercase tracking-wider text-neutral-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Area:
            </span>

            <button
              onClick={() => setSelectedLocality("ALL")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors min-h-[36px] ${
                selectedLocality === "ALL"
                  ? "bg-teal-100 text-[#0F766E] font-bold"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              All Khammam
            </button>

            {localities.map((loc: any) => (
              <button
                key={loc.name}
                onClick={() => setSelectedLocality(loc.name)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors min-h-[36px] ${
                  selectedLocality === loc.name
                    ? "bg-teal-100 text-[#0F766E] font-bold"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {loc.name} ({loc.merchantCount})
              </button>
            ))}
          </div>
        </div>

        {/* Directory Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <ShopCardSkeleton />
            <ShopCardSkeleton />
            <ShopCardSkeleton />
          </div>
        ) : merchants.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
            <Store className="w-12 h-12 text-neutral-300 mx-auto" />
            <h3 className="text-lg font-bold text-neutral-900">No shops found</h3>
            <p className="text-xs text-neutral-500">
              No merchants matched your search. Try resetting your filters.
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
                    <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] overflow-hidden flex items-center justify-center font-bold text-lg shrink-0">
                      {shop.logoUrl ? (
                        <img
                          src={shop.logoUrl}
                          alt={shop.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <Store className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-3xs font-extrabold uppercase">
                        Verified
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
                      <span>{shop.productCount || 0} Products</span>
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-neutral-100">
                  <Link
                    href={`/shops/${shop.id}`}
                    className="w-full py-3 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 min-h-[48px] shadow-xs"
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
