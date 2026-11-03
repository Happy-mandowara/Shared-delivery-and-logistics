"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/components/providers";
import { useCart } from "@/components/cart-context";
import { CartDrawer } from "@/components/cart-drawer";
import { CheckoutModal } from "@/components/checkout-modal";
import { AddressPickerModal } from "@/components/maps/address-picker-modal";
import { InteractiveMap, MapMarkerItem } from "@/components/maps/interactive-map";
import { api } from "@/lib/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Store,
  MapPin,
  Clock,
  KeyRound,
  RefreshCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Truck,
  Layers,
  ChevronRight,
  ArrowRight,
  Calendar,
  Sparkles
} from "lucide-react";

function CustomerPortalContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const queryParamOrderId = searchParams.get("order");

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(queryParamOrderId);
  const [activeTab, setActiveTab] = useState<"orders" | "addresses">("orders");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    if (queryParamOrderId) {
      setSelectedOrderId(queryParamOrderId);
    }
  }, [queryParamOrderId]);

  // Fetch Customer Orders
  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ["customer-orders", user?.id],
    queryFn: async () => {
      const res = await api.get<any>("/orders");
      const list = Array.isArray(res.data) ? res.data : res.data?.orders || [];
      return list.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber || o.order_number,
        status: o.status,
        fulfillmentMode: o.fulfillmentMode || o.fulfillment_mode,
        deliveryLocality: o.deliveryLocality || o.delivery_locality,
        deliveryAddress: o.deliveryAddress || o.delivery_address,
        subtotal: o.subtotal,
        deliveryFee: o.deliveryFee || o.delivery_fee,
        total: o.total,
        podCode: o.podCode || o.pod_code,
        createdAt: o.createdAt || o.created_at,
        suborders: o.suborders || [],
      }));
    },
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (user?.id) {
      refetchOrders();
    }
  }, [user?.id, refetchOrders]);

  const orders = ordersData || [];

  // Auto-select first order if none selected
  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  // Fetch Active Order Details
  const { data: activeOrder, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["customer-order-details", selectedOrderId, user?.id],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      const res = await api.get<any>(`/orders/${selectedOrderId}`);
      const data = res.data?.order || res.data;
      if (!data) return null;
      return {
        id: data.id,
        orderNumber: data.orderNumber || data.order_number,
        status: data.status,
        fulfillmentMode: data.fulfillmentMode || data.fulfillment_mode,
        deliveryAddress: data.deliveryAddress || data.delivery_address,
        deliveryLocality: data.deliveryLocality || data.delivery_locality,
        deliveryLatitude: Number(data.deliveryLatitude || data.delivery_latitude) || 17.255,
        deliveryLongitude: Number(data.deliveryLongitude || data.delivery_longitude) || 80.155,
        total: data.total,
        subtotal: data.subtotal,
        deliveryFee: data.deliveryFee || data.delivery_fee,
        podCode: data.podCode || data.pod_code,
        createdAt: data.createdAt || data.created_at,
        suborders: (data.suborders || []).map((sub: any) => ({
          id: sub.id,
          suborderNumber: sub.suborderNumber || sub.suborder_number,
          merchantId: sub.merchantId || sub.merchant_id,
          merchantName: sub.merchantName || sub.merchant_name || "Partner Shop",
          merchantLocality: sub.merchantLocality || sub.merchant_locality || "Khammam Central",
          merchantAddress: sub.merchantAddress || sub.merchant_address || "Wyra Road, Khammam",
          merchantLatitude: Number(sub.merchantLatitude || sub.merchant_latitude) || 17.2472,
          merchantLongitude: Number(sub.merchantLongitude || sub.merchant_longitude) || 80.1514,
          status: sub.status,
          subtotal: sub.subtotal,
          items: (sub.items || []).map((it: any) => ({
            id: it.id,
            productName: it.productName || it.product_name,
            quantity: it.quantity,
            unitPrice: it.unitPrice || it.unit_price,
            handlingTag: it.handlingTag || it.handling_tag,
          })),
        })),
      };
    },
    enabled: Boolean(selectedOrderId),
  });

  // Fetch Saved Addresses
  const { data: addressesData, isLoading: isLoadingAddresses, refetch: refetchAddresses } = useQuery({
    queryKey: ["customer-saved-addresses", user?.id],
    queryFn: async () => {
      const res = await api.get<any>("/customer/addresses");
      return res.data?.addresses || [];
    },
    enabled: Boolean(user && activeTab === "addresses"),
  });

  const addresses = addressesData || [];

  // Prepare Route Markers for Interactive Map
  const routeMarkers: MapMarkerItem[] = [];
  if (activeOrder) {
    // 1. Merchant Pickups
    activeOrder.suborders.forEach((sub: any, idx: number) => {
      routeMarkers.push({
        id: `pickup-${sub.id}`,
        lat: sub.merchantLatitude,
        lng: sub.merchantLongitude,
        title: `Stop ${idx + 1}: ${sub.merchantName}`,
        description: `Pickup suborder #${sub.suborderNumber} (${sub.items.length} items)`,
        badge: "Pickup Stop",
        type: "pickup",
        sequenceNumber: idx + 1,
        status: sub.status,
      });
    });

    // 2. Customer Delivery Destination
    routeMarkers.push({
      id: `dest-${activeOrder.id}`,
      lat: activeOrder.deliveryLatitude,
      lng: activeOrder.deliveryLongitude,
      title: `Final Stop: Your Delivery Address`,
      description: activeOrder.deliveryAddress,
      badge: "Customer Drop-off",
      type: "dropoff",
      sequenceNumber: activeOrder.suborders.length + 1,
      status: activeOrder.status,
    });
  }

  return (
    <div className="min-h-screen bg-[#F8FAFA] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
                Customer Delivery Portal
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                Khammam Pilot
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Track multi-shop orders, inspect proof-of-delivery codes, and manage saved delivery points.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="secondary" size="sm" className="font-semibold">
                <Store className="w-4 h-4 mr-1.5" /> Browse Shops
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchOrders()}
              className="text-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 border-b border-neutral-200 pb-2">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === "orders"
                ? "bg-[#0F766E] text-white shadow-2xs"
                : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
            }`}
          >
            My Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("addresses")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === "addresses"
                ? "bg-[#0F766E] text-white shadow-2xs"
                : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
            }`}
          >
            Saved Delivery Addresses
          </button>
        </div>

        {/* TAB 1: ORDERS & TRACKING */}
        {activeTab === "orders" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Orders List (Left Column) */}
            <div className="lg:col-span-5 space-y-3">
              <h2 className="text-sm font-bold text-neutral-900 px-1">
                Active & Recent Orders
              </h2>

              {isLoadingOrders ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 bg-white rounded-2xl border border-neutral-200 animate-pulse" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200 space-y-3">
                  <Package className="w-10 h-10 mx-auto text-neutral-300 stroke-1" />
                  <p className="text-sm font-bold text-neutral-800">No Orders Placed Yet</p>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                    Browse Khammam shops to place your first multi-shop shared delivery order.
                  </p>
                  <Link href="/">
                    <Button variant="primary" size="sm" className="mt-2 font-bold">
                      Start Shopping
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {orders.map((o: any) => {
                    const isSelected = selectedOrderId === o.id;
                    return (
                      <div
                        key={o.id}
                        onClick={() => setSelectedOrderId(o.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                          isSelected
                            ? "bg-white border-[#0F766E] shadow-sm ring-1 ring-[#0F766E]"
                            : "bg-white border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-neutral-900">
                            #{o.orderNumber}
                          </span>
                          <StatusBadge status={o.status} />
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-xs text-neutral-500">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="truncate">{o.deliveryAddress}</span>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-neutral-100 text-xs">
                          <span className="text-neutral-500">
                            {new Date(o.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="font-bold text-neutral-900">
                            ₹{Number(o.total).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Order Detail & Live Route Map (Right Column) */}
            <div className="lg:col-span-7">
              {isLoadingDetails ? (
                <div className="h-96 rounded-2xl bg-white border border-neutral-200 animate-pulse p-8" />
              ) : !activeOrder ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200 text-neutral-500">
                  <Package className="w-12 h-12 mx-auto text-neutral-300 mb-2 stroke-1" />
                  <p className="text-sm font-semibold">Select an order on the left to inspect tracking details.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 shadow-2xs space-y-6">
                  {/* Top Bar: Order ID & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-neutral-900">
                          Order #{activeOrder.orderNumber}
                        </h2>
                        <StatusBadge status={activeOrder.status} />
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Fulfillment: <strong className="text-neutral-700">SHARED_DELIVERY</strong> · Khammam Pilot
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-neutral-500">Total Payable</div>
                      <div className="text-lg font-extrabold text-teal-800">
                        ₹{Number(activeOrder.total).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* PROOF OF DELIVERY (POD) CODE CARD */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-amber-800" />
                        Proof of Delivery (POD) Verification Code
                      </div>
                      <p className="text-xs text-amber-800 max-w-md leading-relaxed">
                        Keep this 4-digit code confidential until your rider physically arrives at your door.
                        Provide it to the rider to verify and complete drop-off.
                      </p>
                    </div>

                    <div className="bg-white px-5 py-2.5 rounded-xl border border-amber-300 shadow-xs text-center shrink-0">
                      <div className="text-3xl font-extrabold tracking-widest text-neutral-900 font-mono">
                        {activeOrder.podCode}
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase">
                        Physical Verification
                      </span>
                    </div>
                  </div>

                  {/* INTERACTIVE ROUTE & STOP SEQUENCE MAP */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-teal-700" />
                        Stop Sequence & Route Visualization
                      </h3>
                      <span className="text-[11px] text-neutral-500">
                        {activeOrder.suborders.length} Pickups · 1 Delivery
                      </span>
                    </div>

                    <InteractiveMap
                      height="280px"
                      center={[activeOrder.deliveryLatitude, activeOrder.deliveryLongitude]}
                      zoom={14}
                      markers={routeMarkers}
                      showRoutePolyline
                    />

                    <p className="text-[11px] text-neutral-500">
                      P1, P2 indicate merchant shop pickups; D indicates your delivery address.
                    </p>
                  </div>

                  {/* STOP TIMELINE PROGRESS */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                      Delivery Sequence Status
                    </h3>

                    <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 bg-neutral-50/50">
                      {activeOrder.suborders.map((sub: any, idx: number) => (
                        <div key={sub.id} className="p-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-[11px]">
                              P{idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-neutral-900">{sub.merchantName}</div>
                              <div className="text-[11px] text-neutral-500">{sub.merchantAddress}</div>
                            </div>
                          </div>
                          <StatusBadge status={sub.status} />
                        </div>
                      ))}

                      <div className="p-3 flex items-center justify-between text-xs bg-white">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[11px]">
                            D
                          </span>
                          <div>
                            <div className="font-bold text-neutral-900">Your Drop-off Location</div>
                            <div className="text-[11px] text-neutral-500">{activeOrder.deliveryAddress}</div>
                          </div>
                        </div>
                        <StatusBadge status={activeOrder.status} />
                      </div>
                    </div>
                  </div>

                  {/* SUBORDERS & ITEMS BREAKDOWN */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                      Order Contents ({activeOrder.suborders.length} Merchant Suborders)
                    </h3>

                    <div className="space-y-3">
                      {activeOrder.suborders.map((sub: any) => (
                        <div
                          key={sub.id}
                          className="border border-neutral-200 rounded-xl p-3.5 bg-white space-y-2.5"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 text-xs">
                            <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                              <Store className="w-4 h-4 text-teal-700" />
                              {sub.merchantName}
                            </div>
                            <span className="font-semibold text-neutral-800">
                              Subtotal: ₹{Number(sub.subtotal).toFixed(2)}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {sub.items.map((it: any) => (
                              <div
                                key={it.id}
                                className="flex items-center justify-between text-xs text-neutral-600 py-1"
                              >
                                <span>
                                  {it.quantity}x {it.productName}
                                  {it.handlingTag && (
                                    <span className="ml-2 text-[9px] px-1.5 py-0.2 rounded bg-neutral-100 font-mono text-neutral-700">
                                      {it.handlingTag}
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium text-neutral-900">
                                  ₹{(Number(it.unitPrice) * it.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Financial Summary */}
                    <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-1.5">
                      <div className="flex justify-between text-neutral-600">
                        <span>Items Subtotal</span>
                        <span className="font-semibold text-neutral-900">
                          ₹{Number(activeOrder.subtotal).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-neutral-600">
                        <span>Shared Delivery Fee (Demo Policy)</span>
                        <span className="font-semibold text-neutral-900">
                          ₹{Number(activeOrder.deliveryFee).toFixed(2)}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-neutral-200 flex justify-between text-sm font-bold text-neutral-900">
                        <span>Total Paid</span>
                        <span className="text-teal-800">₹{Number(activeOrder.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SAVED DELIVERY ADDRESSES */}
        {activeTab === "addresses" && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Your Saved Delivery Locations (Khammam)
                </h2>
                <p className="text-xs text-neutral-500">
                  Save your home, office, and preferred delivery pins for quick checkout.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddressModalOpen(true)}
                className="font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Address with Map
              </Button>
            </div>

            {isLoadingAddresses ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 rounded-xl bg-neutral-50 border border-neutral-200 animate-pulse" />
                ))}
              </div>
            ) : addresses.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                <MapPin className="w-8 h-8 mx-auto text-neutral-300 mb-2 stroke-1" />
                <p className="text-xs font-semibold">No saved addresses yet.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setIsAddressModalOpen(true)}
                >
                  Pin Location on Map
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {addresses.map((addr: any) => (
                  <div
                    key={addr.id}
                    className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-700 leading-relaxed font-medium">
                      {addr.addressLine}
                    </p>
                    <div className="text-[11px] text-neutral-500">
                      Locality: <strong>{addr.locality}</strong>
                      {addr.landmark && ` · Near ${addr.landmark}`}
                    </div>
                    {addr.latitude && addr.longitude && (
                      <div className="text-[10px] text-neutral-400 font-mono pt-1">
                        Coordinates: {addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Address Picker Modal */}
      <AddressPickerModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onAddressSaved={() => refetchAddresses()}
      />

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

export default function CustomerPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFA] flex items-center justify-center text-xs text-neutral-500">
          Loading customer delivery portal...
        </div>
      }
    >
      <CustomerPortalContent />
    </Suspense>
  );
}
