"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  Store, 
  MapPin, 
  ArrowRight, 
  Star, 
  Layers, 
  ShoppingBag, 
  Search,
  CheckCircle2
} from "lucide-react";
import { CustomerLayout } from "@/components/layouts/customer-layout";
import { api } from "@/lib/api-client";

const CATEGORY_ICONS: Record<string, string> = {
  "Restaurants": "🍛",
  "Groceries & Staples": "🌾",
  "Groceries & Daily Essentials": "🛒",
  "Groceries": "🌾",
  "Sweets & Bakery": "🍬",
  "Sweets": "🍬",
  "Dairy & Eggs": "🥛",
  "Dairy": "🥛",
  "Produce": "🥬",
  "Pharmacy": "💊",
};

export default function CustomerCategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["customer-catalog-categories"],
    queryFn: async () => {
      const res = await api.get<any>("/categories");
      return res.data || { categoriesWithStores: [], localities: [] };
    },
  });

  const categoriesWithStores: Array<{
    category: string;
    merchantCount: number;
    merchants: Array<{
      id: string;
      name: string;
      code: string;
      locality: string;
      address: string;
      logoUrl: string | null;
      coverUrl: string | null;
      rating: number;
      ratingCount: number;
      productCount: number;
    }>;
  }> = data?.categoriesWithStores || [];

  const filteredCategories = categoriesWithStores
    .filter((cat) => selectedCategory === "ALL" || cat.category === selectedCategory)
    .map((cat) => {
      if (!searchQuery.trim()) return cat;
      const lower = searchQuery.toLowerCase();
      return {
        ...cat,
        merchants: cat.merchants.filter(
          (m) =>
            m.name.toLowerCase().includes(lower) ||
            m.locality.toLowerCase().includes(lower) ||
            cat.category.toLowerCase().includes(lower)
        ),
      };
    })
    .filter((cat) => cat.merchants.length > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-3xs font-extrabold uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5" />
          <span>Verified Local Categories</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Browse Stores by Category
        </h1>
        <p className="text-neutral-600 text-xs sm:text-sm max-w-2xl leading-relaxed">
          Order authentic food, daily groceries, dairy, and traditional sweets from your neighbourhood Khammam stores. Add items across categories into a single shared delivery run.
        </p>
      </div>

      {/* Toolbar: Category Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[44px] ${
              selectedCategory === "ALL"
                ? "bg-[#0F766E] text-white shadow-xs"
                : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            All Categories ({categoriesWithStores.length})
          </button>
          {categoriesWithStores.map((cat) => (
            <button
              key={cat.category}
              type="button"
              onClick={() => setSelectedCategory(cat.category)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 min-h-[44px] ${
                selectedCategory === cat.category
                  ? "bg-[#0F766E] text-white shadow-xs"
                  : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <span>{CATEGORY_ICONS[cat.category] || "🏪"}</span>
              <span>{cat.category}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-3xs font-black ${
                selectedCategory === cat.category
                  ? "bg-teal-800 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}>
                {cat.merchantCount}
              </span>
            </button>
          ))}
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search stores or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[44px]"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-8 animate-pulse">
          <div className="h-40 bg-white rounded-3xl border border-neutral-200" />
          <div className="h-40 bg-white rounded-3xl border border-neutral-200" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <Store className="w-12 h-12 text-neutral-300 mx-auto" />
          <h3 className="text-base font-bold text-neutral-900">No stores found</h3>
          <p className="text-xs text-neutral-500">
            Try adjusting your category selection or search keywords.
          </p>
        </div>
      ) : (
        /* Categories & Dedicated Store Sections */
        <div className="space-y-10">
          {filteredCategories.map((catGroup) => (
            <section key={catGroup.category} className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-2xl bg-teal-50 border border-teal-200 shadow-2xs">
                    {CATEGORY_ICONS[catGroup.category] || "🏪"}
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-neutral-950">
                      {catGroup.category}
                    </h2>
                    <span className="text-3xs text-neutral-500">
                      {catGroup.merchants.length} verified {catGroup.merchants.length === 1 ? "outlet" : "outlets"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stores Grid for this Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {catGroup.merchants.map((shop) => (
                  <div
                    key={shop.id}
                    className="bg-white rounded-3xl border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between overflow-hidden"
                  >
                    {/* Shop Header & Photo */}
                    <div className="p-5 space-y-3.5">
                      <div className="flex items-start gap-3.5">
                        <div className="w-13 h-13 rounded-2xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center font-bold text-xl overflow-hidden shrink-0 shadow-xs">
                          {shop.logoUrl ? (
                            <img
                              src={shop.logoUrl}
                              alt={shop.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Store className="w-6 h-6" />
                          )}
                        </div>
                        <div className="space-y-0.5 truncate flex-1">
                          <h3 className="text-sm font-black text-neutral-950 truncate">
                            {shop.name}
                          </h3>
                          <p className="text-xs text-neutral-600 flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                            <span className="truncate">{shop.locality || "Khammam Central"}</span>
                          </p>
                          <div className="flex items-center gap-2 pt-1 text-3xs font-semibold text-neutral-500">
                            <span className="inline-flex items-center gap-1 text-amber-700 font-bold">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{Number(shop.rating || 4.8).toFixed(1)}</span>
                            </span>
                            <span>·</span>
                            <span className="text-[#0F766E] font-bold">
                              {shop.productCount || 0} items
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                        {shop.address || `Located along ${shop.locality}, Khammam. Verified shared-delivery partner outlet.`}
                      </p>
                    </div>

                    {/* Action Button: Direct Storefront Link */}
                    <div className="p-3.5 bg-neutral-50/80 border-t border-neutral-100">
                      <Link
                        href={`/shops/${shop.id}`}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 min-h-[44px] shadow-xs"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Browse Store Items</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

