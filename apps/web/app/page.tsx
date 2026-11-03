"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/components/providers";
import { useCart } from "@/components/cart-context";
import { CartDrawer } from "@/components/cart-drawer";
import { CheckoutModal } from "@/components/checkout-modal";
import { InteractiveMap, MapMarkerItem } from "@/components/maps/interactive-map";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  MapPin,
  Search,
  Store,
  Layers,
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Clock,
  ArrowRight,
  Flame,
  ShieldCheck,
  Truck,
  Info
} from "lucide-react";

export default function MarketplaceHomePage() {
  const { user } = useAuth();
  const { addItem, items: cartItems } = useCart();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocality, setSelectedLocality] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // 1. Fetch Merchants
  const { data: merchantsData, isLoading: isLoadingMerchants } = useQuery({
    queryKey: ["merchants", searchQuery, selectedLocality],
    queryFn: async () => {
      let url = "/merchants";
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (selectedLocality !== "ALL") params.append("locality", selectedLocality);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get<any>(url);
      return res.data?.merchants || [];
    },
  });

  const merchants = merchantsData || [];

  // 2. Fetch Selected Merchant Products (Storefront Modal)
  const { data: storeProductsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["merchant-products", selectedMerchantId, selectedCategory],
    queryFn: async () => {
      if (!selectedMerchantId) return { products: [], categories: [] };
      let url = `/merchants/${selectedMerchantId}/products`;
      if (selectedCategory !== "ALL") {
        url += `?category=${encodeURIComponent(selectedCategory)}`;
      }
      const res = await api.get<any>(url);
      return res.data || { products: [], categories: [] };
    },
    enabled: Boolean(selectedMerchantId),
  });

  const selectedMerchant = merchants.find((m: any) => m.id === selectedMerchantId);
  const storeProducts = storeProductsData?.products || [];
  const storeCategories = storeProductsData?.categories || [];

  // Map Markers for Khammam Overview
  const mapMarkers: MapMarkerItem[] = merchants.map((m: any) => ({
    id: m.id,
    lat: Number(m.latitude) || 17.2485,
    lng: Number(m.longitude) || 80.153,
    title: m.name,
    description: `${m.address} · ${m.productCount || 0} items available`,
    badge: m.locality,
    type: "merchant",
  }));

  const getItemQuantityInCart = (productId: string) => {
    const found = cartItems.find((i) => i.productId === productId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFA] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-8">
        {/* Khammam Pilot Hero */}
        <div className="bg-gradient-to-br from-[#0F766E] via-[#0d5f58] to-[#093f3a] rounded-3xl p-6 sm:p-10 text-white shadow-md relative overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md border border-white/20">
              <MapPin className="w-3.5 h-3.5" />
              <span>Khammam Pilot: Multi-Shop Shared Delivery</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Order from multiple Khammam shops in one delivery batch.
            </h1>

            <p className="text-sm sm:text-base text-teal-100 leading-relaxed">
              Combine authentic biryani from <strong className="text-white">Bawarchi</strong>, daily staples from{" "}
              <strong className="text-white">Balaji Kirana</strong>, and pure ghee sweets from{" "}
              <strong className="text-white">Sri Krishna</strong>. One delivery rider collects all your items in a single trip.
            </p>

            {/* Search Bar */}
            <div className="pt-2">
              <div className="relative max-w-lg">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search biryani, atta, kaju katli, or shops in Khammam..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-400 shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Locality Quick Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="font-bold text-neutral-500 uppercase tracking-wider shrink-0 mr-1 text-[11px]">
            Area:
          </span>
          {["ALL", "Khammam Central", "Wyra Road", "Mayuri Centre", "Station Road"].map((loc) => (
            <button
              key={loc}
              onClick={() => setSelectedLocality(loc)}
              className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors cursor-pointer ${
                selectedLocality === loc
                  ? "bg-[#0F766E] text-white shadow-xs"
                  : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
              }`}
            >
              {loc === "ALL" ? "All Khammam" : loc}
            </button>
          ))}
        </div>

        {/* Section: Interactive Khammam Map & Local Shops */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Khammam Interactive Map */}
          <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal-700" />
                  Khammam Shop Locations
                </h3>
                <p className="text-[11px] text-neutral-500">
                  3 active partner shops in pilot zone
                </p>
              </div>
            </div>

            <InteractiveMap
              height="260px"
              center={[17.2485, 80.153]}
              zoom={14}
              markers={mapMarkers}
            />

            <div className="text-[11px] text-neutral-500 flex items-start gap-1.5 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
              <Info className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
              <span>
                Delivery partners are dispatched from Wyra Road and Station Road clusters to minimize delivery times.
              </span>
            </div>
          </div>

          {/* Right Column: Active Merchant Cards */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Partner Merchant Shops</h2>
                <p className="text-xs text-neutral-500">
                  Select a shop to explore products and add items to your shared basket
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                {merchants.length} Shops Live
              </span>
            </div>

            {isLoadingMerchants ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 rounded-2xl bg-white border border-neutral-200 animate-pulse p-4 space-y-3" />
                ))}
              </div>
            ) : merchants.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200 text-neutral-500">
                <Store className="w-10 h-10 mx-auto text-neutral-300 mb-2 stroke-1" />
                <p className="text-sm font-semibold">No merchants match your filter</p>
                <p className="text-xs text-neutral-400 mt-1">Try selecting 'All Khammam' or clearing your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {merchants.map((merchant: any) => (
                  <div
                    key={merchant.id}
                    className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-2xs hover:border-[#0F766E] hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 mb-1">
                            {merchant.locality}
                          </div>
                          <h3 className="font-extrabold text-base text-neutral-900">
                            {merchant.name}
                          </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-lg shrink-0">
                          <Store className="w-5 h-5" />
                        </div>
                      </div>

                      <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                        {merchant.address}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-neutral-500 pt-1">
                        <span className="font-semibold text-neutral-800">
                          {merchant.productCount || 0} Products
                        </span>
                        <span>•</span>
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified Shop
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 mt-2 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-neutral-400 font-medium">
                        {merchant.code}
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedMerchantId(merchant.id);
                          setSelectedCategory("ALL");
                        }}
                        className="font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Browse Shop</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section: How Shared Delivery Works in Khammam */}
        <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
              How Khammam Shared Delivery Works
            </h2>
            <p className="text-xs text-neutral-500">
              One delivery partner collects compatible orders from multiple shops in one route.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200 space-y-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mx-auto font-bold">
                1
              </div>
              <h3 className="font-bold text-sm text-neutral-900">Multi-Shop Cart</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Add chicken biryani from Wyra Road and sweets from Station Road into one basket.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200 space-y-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mx-auto font-bold">
                2
              </div>
              <h3 className="font-bold text-sm text-neutral-900">Intelligent Batching</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                The engine bundles compatible stops so riders do not make redundant cross-town trips.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-200 space-y-2 text-center">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mx-auto font-bold">
                3
              </div>
              <h3 className="font-bold text-sm text-neutral-900">POD Code Handover</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Verify drop-off with your 4-digit verification code. Delivery outcomes are physically audited.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Storefront Modal: Detailed Merchant Product Browser */}
      {selectedMerchant && (
        <Modal
          isOpen={Boolean(selectedMerchantId)}
          onClose={() => setSelectedMerchantId(null)}
          title={selectedMerchant.name}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5">
            {/* Storefront Header */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-teal-800">{selectedMerchant.locality}</div>
                <div className="text-xs text-neutral-600 mt-0.5">{selectedMerchant.address}</div>
              </div>
              <div className="text-xs text-neutral-500 font-mono">
                Shop Code: <span className="font-bold text-neutral-800">{selectedMerchant.code}</span>
              </div>
            </div>

            {/* Category Filter Pills */}
            {storeCategories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer ${
                    selectedCategory === "ALL"
                      ? "bg-[#0F766E] text-white"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  All Items ({storeProducts.length})
                </button>
                {storeCategories.map((cat: string) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer shrink-0 ${
                      selectedCategory === cat
                        ? "bg-[#0F766E] text-white"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Products Grid */}
            {isLoadingProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-8 text-center text-xs text-neutral-500 animate-pulse">
                Loading shop products...
              </div>
            ) : storeProducts.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs">
                No active products found in this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                {storeProducts.map((prod: any) => {
                  const qtyInCart = getItemQuantityInCart(prod.id);
                  const isOutOfStock = prod.stockStatus === "OUT_OF_STOCK";
                  const isCallToConfirm = prod.stockStatus === "CALL_TO_CONFIRM";

                  return (
                    <div
                      key={prod.id}
                      className="p-4 rounded-xl border border-neutral-200 bg-white hover:border-teal-600 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-neutral-900 leading-snug">
                            {prod.name}
                          </h4>
                          {/* Stock Status Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              isOutOfStock
                                ? "bg-red-100 text-red-800"
                                : isCallToConfirm
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isOutOfStock
                              ? "Out of Stock"
                              : isCallToConfirm
                              ? "Call to Confirm"
                              : "In Stock"}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                          {prod.description}
                        </p>

                        <div className="flex items-center gap-2 pt-1">
                          {prod.handlingTag && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700">
                              {prod.handlingTag.replace("_", " ")}
                            </span>
                          )}
                          <span className="text-[11px] text-neutral-400">
                            {prod.category}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                        <div className="text-base font-extrabold text-neutral-900">
                          ₹{Number(prod.price).toFixed(2)}
                        </div>

                        {/* Add to Basket button or in-cart quantity indicator */}
                        {isOutOfStock ? (
                          <span className="text-xs font-semibold text-neutral-400">
                            Unavailable
                          </span>
                        ) : qtyInCart > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-900 border border-teal-200 text-xs font-bold">
                            <Check className="w-3.5 h-3.5 text-teal-700" />
                            <span>{qtyInCart} in Basket</span>
                          </div>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              addItem({
                                productId: prod.id,
                                merchantId: selectedMerchant.id,
                                merchantName: selectedMerchant.name,
                                merchantLocality: selectedMerchant.locality,
                                name: prod.name,
                                price: Number(prod.price),
                                handlingTag: prod.handlingTag,
                              })
                            }
                            className="font-bold cursor-pointer"
                          >
                            + Add to Basket
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Cart Drawer */}
      <CartDrawer onCheckout={() => setIsCheckoutOpen(true)} />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />
    </div>
  );
}
