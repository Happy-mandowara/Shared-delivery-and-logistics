"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  Package, 
  Clock, 
  MapPin, 
  Store, 
  Truck, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShoppingBag,
  Sparkles,
  ChevronRight,
  Layers,
  UtensilsCrossed,
  Pill,
  Smartphone,
  Apple
} from "lucide-react";
import { useAuth } from "@/components/providers";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline } from "@/components/ui/timeline";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

export default function CustomerDashboardPage() {
  const { user } = useAuth();

  // 1. Fetch Customer Orders
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["customer-orders"],
    queryFn: async () => {
      const res = await api.get<any>("/orders");
      return res.data?.orders || (Array.isArray(res.data) ? res.data : []);
    },
  });

  // 2. Fetch Featured Khammam Shops
  const { data: merchantsData } = useQuery({
    queryKey: ["customer-featured-merchants"],
    queryFn: async () => {
      const res = await api.get<any>("/merchants");
      return res.data?.merchants?.slice(0, 3) || [];
    },
  });

  // 3. Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ["customer-categories"],
    queryFn: async () => {
      const res = await api.get<any>("/categories");
      return res.data?.merchantCategories || [];
    },
    staleTime: 60000,
  });

  const orders = ordersData || [];
  const merchants = merchantsData || [];

  const activeOrders = orders.filter((o: any) => 
    ["PENDING", "ACCEPTED", "BATCHED", "ASSIGNED", "DISPATCHED", "IN_TRANSIT"].includes(o.status)
  );
  const completedOrders = orders.filter((o: any) => 
    ["DELIVERED", "COMPLETED", "CANCELLED", "FAILED"].includes(o.status)
  );

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <span className="text-3xs font-extrabold uppercase tracking-widest text-[#0F766E] block">
            Customer Dashboard · Khammam Sector 01
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Namaste, {user?.full_name?.split(" ")[0] || "Shopper"}!
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Track active shipments, review past orders, or order fresh items across local Khammam stores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/customer/explore"
            className="px-5 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center gap-2 min-h-[48px] shadow-xs"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Browse Shops</span>
          </Link>
          <Link
            href="/customer/cart"
            className="px-5 py-3 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-bold transition-colors min-h-[48px] flex items-center gap-2"
          >
            <span>My Cart</span>
          </Link>
        </div>
      </div>

      {/* Browse by Category Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-neutral-950 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#0F766E]" />
              <span>Explore by Category</span>
            </h2>
            <p className="text-xs text-neutral-500">Discover local merchants organized by sector in Khammam</p>
          </div>
          <Link
            href="/customer/explore"
            className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1"
          >
            <span>View All Stores</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(categoriesData && categoriesData.length > 0 ? categoriesData : [
            { name: "Groceries", merchantCount: 2 },
            { name: "Restaurants", merchantCount: 3 },
            { name: "Medical & Pharmacy", merchantCount: 1 },
            { name: "Bakery & Sweets", merchantCount: 1 },
            { name: "Fresh Produce", merchantCount: 1 },
            { name: "General Stores", merchantCount: 1 },
          ]).map((cat: any) => {
            const isFood = /restaurant|food|biryani|kitchen/i.test(cat.name);
            const isMedical = /medic|pharm/i.test(cat.name);
            const isTech = /elec|mobile/i.test(cat.name);
            const isGrocery = /groc|produce|veg|fruit/i.test(cat.name);

            return (
              <Link
                key={cat.name}
                href={`/customer/explore?category=${encodeURIComponent(cat.name)}`}
                className="p-3.5 rounded-2xl bg-white border border-neutral-200 hover:border-teal-400 hover:shadow-xs transition-all group flex flex-col items-center text-center gap-2 min-h-[96px] justify-center"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-50 group-hover:bg-[#0F766E] group-hover:text-white text-[#0F766E] flex items-center justify-center transition-colors">
                  {isFood ? (
                    <UtensilsCrossed className="w-5 h-5" />
                  ) : isMedical ? (
                    <Pill className="w-5 h-5" />
                  ) : isTech ? (
                    <Smartphone className="w-5 h-5" />
                  ) : isGrocery ? (
                    <Apple className="w-5 h-5" />
                  ) : (
                    <Store className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-neutral-900 group-hover:text-[#0F766E] block truncate max-w-[110px]">
                    {cat.name}
                  </span>
                  <span className="text-3xs text-neutral-500 font-medium">
                    {cat.merchantCount} {cat.merchantCount === 1 ? "store" : "stores"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Active Orders Section */}
      {activeOrders.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-black text-neutral-950 tracking-tight">
              Active Shipments in Transit ({activeOrders.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeOrders.map((order: any) => (
              <div
                key={order.id}
                className="p-6 rounded-3xl bg-white border border-teal-200 shadow-xs space-y-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-3xs font-extrabold uppercase text-neutral-400 block">
                      Order #{order.id.slice(0, 8)}
                    </span>
                    <span className="text-sm font-bold text-neutral-900 block mt-0.5">
                      {order.suborder_count || 1} Merchant Suborder(s)
                    </span>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* POD PIN Alert Banner */}
                {(order.podCode || order.pod_code) && (
                  <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#0F766E]" />
                      <span className="text-xs text-neutral-700 font-medium">Your Handover PIN:</span>
                    </div>
                    <span className="text-base font-black text-[#0F766E] tracking-widest bg-white px-2.5 py-0.5 rounded-lg border border-teal-300">
                      {order.podCode || order.pod_code}
                    </span>
                  </div>
                )}

                <div className="space-y-2 text-xs text-neutral-600">
                  <div className="flex items-center justify-between">
                    <span>Delivery Address:</span>
                    <strong className="text-neutral-900 truncate max-w-[200px]">
                      {order.deliveryAddress || order.delivery_address || "Wyra Road, Khammam"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Order Total:</span>
                    <strong className="text-neutral-900">₹{Number(order.total || order.total_amount || 0).toFixed(2)}</strong>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <Link
                    href={`/customer/orders/${order.id}`}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-[#0F766E] text-white text-xs font-bold text-center transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
                  >
                    <span>View Order Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/customer/track/${order.batch_id || order.id}`}
                    className="py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-xs font-bold text-neutral-800 transition-colors min-h-[44px] flex items-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Track</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Khammam Merchants */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-neutral-950 tracking-tight">
            Order Again from Khammam Favourites
          </h2>
          <Link
            href="/customer/explore"
            className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {merchants.map((shop: any) => (
            <div
              key={shop.id}
              className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center font-bold mb-3">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">{shop.name}</h3>
                <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{shop.locality || "Khammam Sector 01"}</span>
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100">
                <Link
                  href={`/shops/${shop.id}`}
                  className="w-full py-2 px-3 rounded-lg bg-neutral-100 hover:bg-[#0F766E] hover:text-white text-neutral-800 text-xs font-bold transition-colors flex items-center justify-center gap-1 min-h-[40px]"
                >
                  <span>Open Store</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order History Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-neutral-950 tracking-tight">
            Order History
          </h2>
          <Link
            href="/customer/orders"
            className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1"
          >
            <span>Full History</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoadingOrders ? (
          <div className="p-8 rounded-2xl bg-white border border-neutral-200 animate-pulse h-32" />
        ) : orders.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200">
            <Package className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <span className="text-sm font-bold text-neutral-900 block">No orders placed yet</span>
            <p className="text-xs text-neutral-500 mt-1">Discover items from local Khammam stores and place your first shared delivery order.</p>
            <Link
              href="/customer/explore"
              className="mt-4 inline-block px-4 py-2 rounded-xl bg-[#0F766E] text-white text-xs font-bold"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden divide-y divide-neutral-100">
            {orders.slice(0, 5).map((order: any) => (
              <div
                key={order.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/60 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-neutral-900">
                      Order #{order.id.slice(0, 8)}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <span className="text-xs text-neutral-500 block">
                    Placed on {(order.createdAt || order.created_at) ? new Date(order.createdAt || order.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "Today"} · {order.items?.length || order.suborder_count || 1} items
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="text-sm font-black text-neutral-900">
                    ₹{Number(order.total || order.total_amount || 0).toFixed(2)}
                  </span>
                  <Link
                    href={`/customer/orders/${order.id}`}
                    className="px-3.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-xs font-bold text-neutral-800 transition-colors min-h-[36px] flex items-center gap-1"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
