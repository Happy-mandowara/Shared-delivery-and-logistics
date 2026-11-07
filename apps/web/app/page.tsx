"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  ShoppingBag, 
  Store, 
  Truck, 
  MapPin, 
  Search, 
  ArrowRight, 
  Layers, 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  PhoneCall, 
  Compass, 
  IndianRupee,
  Navigation,
  ChevronRight,
  PackageCheck
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { api } from "@/lib/api-client";
import { RouteMap } from "@/components/ui/route-map";
import { useCart } from "@/components/cart-context";

export default function RebuiltHomePage() {
  const { addItem, items: cartItems } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocality, setSelectedLocality] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // 1. Fetch Verified Merchants
  const { data: merchantsData, isLoading: isLoadingMerchants } = useQuery({
    queryKey: ["merchants", searchQuery, selectedLocality, selectedCategory],
    queryFn: async () => {
      let url = "/merchants";
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (selectedLocality !== "ALL") params.append("locality", selectedLocality);
      if (selectedCategory !== "ALL") params.append("category", selectedCategory);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get<any>(url);
      return res.data?.merchants || [];
    },
  });

  const merchants = merchantsData || [];

  const localities = [
    { label: "All Khammam", value: "ALL" },
    { label: "Wyra Road", value: "Wyra Road" },
    { label: "Mamata Hospital Road", value: "Mamata Hospital Road" },
    { label: "Gandhi Chowk", value: "Gandhi Chowk" },
    { label: "Bypass Road", value: "Bypass Road" },
  ];

  const categories = [
    { title: "Hot Kitchens & Biryani", key: "Restaurants", count: "Verified Menus", icon: "🍛" },
    { title: "Kirana & Staples", key: "Groceries & Staples", count: "Daily Essentials", icon: "🌾" },
    { title: "Daily Dairy & Sweets", key: "Dairy & Eggs", count: "Fresh Products", icon: "🥛" },
    { title: "Super Bazaar & Marts", key: "Groceries & Daily Essentials", count: "Household", icon: "🥬" },
    { title: "Traditional Sweets", key: "Sweets & Bakery", count: "Regional Delicacies", icon: "🍬" },
    { title: "Fresh Produce & Essentials", key: "Groceries", count: "Local Outlets", icon: "🥕" },
  ];

  // Map markers for verified stops in Khammam
  const sampleMapStops = [
    {
      id: "shop-1",
      name: "Bawarchi Biryani Central",
      address: "Wyra Road, Beside Clock Tower, Khammam",
      lat: 17.2472,
      lng: 80.1514,
      type: "PICKUP" as const,
      status: "COMPLETED" as const,
      locality: "Wyra Road"
    },
    {
      id: "shop-2",
      name: "Sri Balaji Supermarket",
      address: "Near Bus Station Road, Khammam",
      lat: 17.251,
      lng: 80.158,
      type: "PICKUP" as const,
      status: "COMPLETED" as const,
      locality: "Bus Stand Road"
    },
    {
      id: "drop-1",
      name: "Customer Drop-off (Ramesh)",
      address: "Mamata General Hospital Quarters, Khammam",
      lat: 17.2589,
      lng: 80.1422,
      type: "DROPOFF" as const,
      status: "PENDING" as const,
      locality: "Mamata Hospital"
    },
    {
      id: "drop-2",
      name: "Customer Drop-off (Priya)",
      address: "Plot 42, Bank Colony, Khammam",
      lat: 17.263,
      lng: 80.165,
      type: "DROPOFF" as const,
      status: "PENDING" as const,
      locality: "Bank Colony"
    }
  ];

  return (
    <PublicLayout>
      {/* SECTION 1: HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-900/10 via-[#F8FAFA] to-[#F8FAFA] pt-12 pb-20 border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6">
              {/* Hub Chip */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 border border-teal-300 text-teal-900 text-xs font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-[#0F766E] animate-pulse" />
                <span>Sector 01 Live · Khammam Municipal Corporation</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-neutral-950 tracking-tight leading-[1.12]">
                Order from multiple Khammam shops. <br />
                <span className="text-[#0F766E]">One single delivery.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-2xl">
                NationX coordinates neighbouring merchants into one shared delivery batch. Get Bawarchi biryani, fresh groceries from Sri Balaji, and essentials delivered together by a single verified partner.
              </p>

              {/* Live Locality Quick Filter & Search Bar */}
              <div className="p-2 sm:p-3 bg-white rounded-2xl shadow-md border border-neutral-200/80 space-y-3">
                <div className="flex flex-wrap gap-1.5 pb-2 border-b border-neutral-100">
                  {localities.map((loc) => (
                    <button
                      key={loc.value}
                      onClick={() => setSelectedLocality(loc.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
                        selectedLocality === loc.value
                          ? "bg-[#0F766E] text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {loc.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search shops, dishes, groceries or medicines in Khammam..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-neutral-50 rounded-xl text-sm font-medium border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:bg-white transition-all"
                    />
                  </div>
                  <Link
                    href={`/explore?q=${encodeURIComponent(searchQuery)}`}
                    className="px-6 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-sm font-bold shadow-xs flex items-center gap-2 transition-colors min-h-[48px]"
                  >
                    <span>Find</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Live Network Pulse Metrics */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                  <span className="text-2xl font-black text-neutral-900 block">3+</span>
                  <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-500">Active Outlets</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                  <span className="text-2xl font-black text-[#0F766E] block">100%</span>
                  <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-500">POD Verified</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-neutral-200 shadow-2xs">
                  <span className="text-2xl font-black text-neutral-900 block">₹0</span>
                  <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-500">Duplicate Fees</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Shared-Batch Demonstration Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-neutral-200/90 relative">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-900">
                      Live Coordinated Run #BAT-KHM-01
                    </span>
                  </div>
                  <span className="text-3xs font-extrabold px-2 py-0.5 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
                    SHARED BATCH
                  </span>
                </div>

                <div className="my-4">
                  <RouteMap
                    stops={sampleMapStops}
                    batchId="BAT-KHM-01"
                    status="ACTIVE"
                    className="h-64 rounded-xl border border-neutral-200"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <Store className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold text-neutral-900 block">Stop 1 & 2: Pickups at Wyra Road</span>
                      <span className="text-neutral-500">Bawarchi (Biryani) + Sri Balaji (Household items)</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                    <Truck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold text-neutral-900 block">Stop 3 & 4: Coordinated Drop-offs</span>
                      <span className="text-neutral-500">Mamata Hospital Quarters & Bank Colony</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Batch efficiency score:</span>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    1 Rider · 2 Shops · 2 Customers
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: HOW SHARED DELIVERY WORKS */}
      <section className="py-20 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#0F766E] block mb-2">
              The Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
              How NationX Shared Batching Works
            </h2>
            <p className="mt-3 text-base text-neutral-600">
              Unlike legacy apps that dispatch a separate rider for every single order, NationX groups compatible orders into synchronized local batches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="p-8 rounded-2xl bg-[#F8FAFA] border border-neutral-200 relative group hover:border-teal-400 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[#0F766E] text-white flex items-center justify-center font-black text-xl mb-6 shadow-xs">
                1
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                Multi-Store Cart
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Add chicken biryani from Bawarchi and groceries from Sri Balaji in a single checkout. Each merchant prepares independently.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[#0F766E]">
                <span>Independent suborders preserved</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-2xl bg-[#F8FAFA] border border-neutral-200 relative group hover:border-teal-400 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-teal-800 text-white flex items-center justify-center font-black text-xl mb-6 shadow-xs">
                2
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                Intelligent Batching
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Our engine combines compatible orders along Wyra Road into one optimal route. One delivery partner handles both pickups.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs font-bold text-teal-800">
                <span>Zero dispatch holding delays</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-2xl bg-[#F8FAFA] border border-neutral-200 relative group hover:border-teal-400 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-black text-xl mb-6 shadow-xs">
                3
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                4-Digit PIN Handover
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Rider delivers to your doorstep. Physical completion requires your secure 4-digit Proof of Delivery PIN. No fake delivery marks.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs font-bold text-neutral-900">
                <span>Tamper-proof physical audit</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: VERIFIED KHAMMAM SHOPS */}
      <section id="stores-section" className="py-20 bg-[#F8FAFA] border-b border-neutral-200 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#0F766E] block mb-2">
                Verified Partners
              </span>
              <h2 className="text-3xl font-extrabold text-neutral-950 tracking-tight">
                Featured Khammam Merchant Outlets
              </h2>
              <p className="mt-2 text-sm text-neutral-600">
                {selectedCategory !== "ALL" ? (
                  <span className="flex items-center gap-2 mt-1">
                    <span>Showing verified outlets in category: <strong>{selectedCategory}</strong></span>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("ALL")}
                      className="text-xs font-bold text-[#0F766E] hover:underline"
                    >
                      (Clear filter & show all)
                    </button>
                  </span>
                ) : (
                  "Every merchant is verified with physical storefront inspection and live inventory tracking."
                )}
              </p>
            </div>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#0F766E] hover:text-[#0D625C] min-h-[48px]"
            >
              <span>View all shops directory</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {merchants.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-neutral-200">
                <Store className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-neutral-900">No stores found in this category</h3>
                <p className="text-xs text-neutral-500 mt-1">Try selecting another category or clear the filter.</p>
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className="mt-3 px-4 py-2 rounded-xl bg-[#0F766E] text-white text-xs font-bold"
                >
                  Show All Stores
                </button>
              </div>
            ) : (
              merchants.map((m: any) => (
                <div
                  key={m.id}
                  className="bg-white rounded-2xl p-6 border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center font-bold text-lg">
                        <Store className="w-6 h-6" />
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-3xs font-extrabold uppercase">
                        {m.category || "Active Outlet"}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-neutral-900">{m.name}</h3>
                    <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{m.address || m.locality || "Khammam"}</span>
                    </p>

                    <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
                      <span className="font-semibold text-teal-800">{m.locality || "Central Zone"}</span>
                      <span>15–25 mins prep</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-100">
                    <Link
                      href={`/shops/${m.id}`}
                      className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-[#0F766E] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      <span>Browse Storefront</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* SECTION 4: LOCAL COMMERCE CATEGORIES */}
      <section className="py-20 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#0F766E] block mb-2">
              Browse Categories
            </span>
            <h2 className="text-3xl font-extrabold text-neutral-950 tracking-tight">
              Everything Khammam Has to Offer
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Select any category to view verified merchant outlets in Khammam
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.title}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.key);
                  const el = document.getElementById("stores-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className={`p-5 rounded-2xl border text-center transition-all group flex flex-col items-center justify-center min-h-[140px] cursor-pointer ${
                  selectedCategory === cat.key
                    ? "bg-teal-50/80 border-[#0F766E] shadow-sm ring-2 ring-[#0F766E]"
                    : "bg-[#F8FAFA] border-neutral-200 hover:border-teal-400 hover:bg-teal-50/40"
                }`}
              >
                <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">{cat.icon}</span>
                <span className="text-xs font-bold text-neutral-900 block leading-tight">{cat.title}</span>
                <span className="text-3xs text-neutral-500 font-semibold mt-1">{cat.count}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: LIVE COVERAGE IN KHAMMAM */}
      <section className="py-20 bg-[#F8FAFA] border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#0F766E] block">
                Delivery Service Area
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight">
                Covering Khammam&apos;s Core High-Density Corridors
              </h2>
              <p className="text-base text-neutral-600 leading-relaxed">
                NationX is actively servicing orders across Wyra Road, Mamata Hospital Road, Railway Station Road, and Bypass Road. Our batching polygon is optimized for two-wheeler transport under Khammam traffic conditions.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-neutral-200">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                    01
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-900 block">Wyra Road Corridor</span>
                    <span className="text-xs text-neutral-500">Commercial hub: Bawarchi, Kirana stores, bakeries</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-neutral-200">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                    02
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-900 block">Mamata Hospital Residential Belt</span>
                    <span className="text-xs text-neutral-500">High-density drop-off destination</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-neutral-200">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
                    03
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-900 block">Old Bus Depot & Gandhi Chowk</span>
                    <span className="text-xs text-neutral-500">Wholesale staples and regional delicacies</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-lg">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">Khammam Sector 01 Polygon</span>
                    <span className="text-2xs text-neutral-500">Verified coordinates (17.2472°N, 80.1514°E)</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-teal-50 text-[#0F766E] text-3xs font-bold">
                    4.2 km Active Radius
                  </span>
                </div>
                <div className="my-4">
                  <RouteMap
                    stops={sampleMapStops}
                    batchId="KHM-SECTOR-01"
                    status="ACTIVE"
                    className="h-80 rounded-xl"
                  />
                </div>
                <p className="text-2xs text-neutral-400 text-center">
                  Live GPS simulation disabled per Project 03 rules. Markers reflect genuine geo-coordinates in Khammam.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: VALUE PROPOSITION (MERCHANT & PARTNER) */}
      <section className="py-20 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Merchant Card */}
            <div className="p-8 sm:p-10 rounded-3xl bg-teal-950 text-white relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-3xs font-extrabold uppercase tracking-widest text-teal-400">
                  For Local Shopkeepers
                </span>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Reach customers without 30% aggregator commission.
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  NationX coordinates dispatch so multiple shops share one rider. You keep your full retail margin, control your preparation timing, and mark orders ready when actually ready.
                </p>
                <ul className="space-y-2 text-xs text-neutral-200 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    <span>Independent suborders — clear shop payouts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    <span>Real-time inventory status with freshness controls</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    <span>Direct merchant portal with barcode/item readiness</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-6 border-t border-neutral-800">
                <Link
                  href="/register/shop"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0F766E] hover:bg-[#115e59] text-white font-bold text-xs min-h-[48px]"
                >
                  <span>Onboard Your Khammam Shop</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Delivery Partner Card */}
            <div className="p-8 sm:p-10 rounded-3xl bg-neutral-900 text-white relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-3xs font-extrabold uppercase tracking-widest text-teal-400">
                  For Delivery Partners
                </span>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Earn more per kilometre with batched runs.
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Stop driving back and forth for single deliveries. NationX shared batches bundle 2–3 pickups and drop-offs along your route, maximizing your earnings per trip.
                </p>
                <ul className="space-y-2 text-xs text-neutral-200 pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    <span>Higher pay per hour with multi-stop batching</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    <span>Secure 4-digit PIN customer verification protects you</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    <span>Transparent daily settlement records in app</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-6 border-t border-neutral-800">
                <Link
                  href="/register/partner"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0F766E] hover:bg-[#115e59] text-white font-bold text-xs min-h-[48px]"
                >
                  <span>Join Khammam Delivery Fleet</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* SECTION 8: DUAL ONBOARDING CALL TO ACTION */}
      <section className="py-20 bg-gradient-to-r from-teal-900 via-[#0F766E] to-teal-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="max-w-3xl mx-auto space-y-4">
            <span className="px-3.5 py-1.5 rounded-full bg-teal-800/80 border border-teal-600 text-teal-200 text-xs font-bold uppercase tracking-wider inline-block">
              Telangana Logistics Network
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Experience the Future of Local Shared Logistics
            </h2>
            <p className="text-base sm:text-lg text-teal-100 max-w-2xl mx-auto">
              Ready to explore? Discover verified merchants, test the multi-store checkout, or sign in to evaluate the merchant, rider, and admin dispatch portals.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/explore"
              className="px-8 py-3.5 rounded-xl bg-white text-[#0F766E] hover:bg-neutral-100 font-extrabold text-sm shadow-md transition-colors min-h-[48px] flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore Marketplace</span>
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-xl bg-teal-950/60 hover:bg-teal-950 border border-teal-500 text-white font-extrabold text-sm transition-colors min-h-[48px] flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Sign In to Portals</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
