"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ShoppingBag, 
  MapPin, 
  Store, 
  CreditCard, 
  Banknote, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles
} from "lucide-react";
import { useCart } from "@/components/cart-context";
import { useAuth } from "@/components/providers";
import { api } from "@/lib/api-client";

export default function CustomerCheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, totalAmount, clearCart } = useCart();

  const [deliveryAddress, setDeliveryAddress] = useState(
    "Mamata General Hospital Quarters, Block B, Wyra Road, Khammam"
  );
  const [deliveryLatitude, setDeliveryLatitude] = useState(17.2589);
  const [deliveryLongitude, setDeliveryLongitude] = useState(80.1422);
  const [locality, setLocality] = useState("Mamata Hospital Road");
  const [paymentMethod, setPaymentMethod] = useState<"CASH_ON_DELIVERY" | "ONLINE">("CASH_ON_DELIVERY");
  const [instructions, setInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Group items by merchant
  const merchantGroups = items.reduce((acc, item) => {
    const key = item.merchantId;
    if (!acc[key]) {
      acc[key] = {
        merchantId: item.merchantId,
        merchantName: item.merchantName || "Local Shop",
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { merchantId: string; merchantName: string; items: typeof items }>);

  const groups = Object.values(merchantGroups);
  const deliveryFee = groups.length > 0 ? 30 : 0;
  const platformFee = groups.length > 0 ? 10 : 0;
  const finalTotal = totalAmount + deliveryFee + platformFee;

  const savedAddresses = [
    {
      label: "Home (Mamata Hospital Quarters)",
      address: "Mamata General Hospital Quarters, Block B, Wyra Road, Khammam",
      locality: "Mamata Hospital Road",
      lat: 17.2589,
      lng: 80.1422,
    },
    {
      label: "Office (Wyra Road Commercial Complex)",
      address: "Shop 14, Opposite Municipal Office, Wyra Road, Khammam",
      locality: "Wyra Road",
      lat: 17.2472,
      lng: 80.1514,
    },
    {
      label: "Family (Bank Colony)",
      address: "Plot 42, Bank Colony, Khammam",
      locality: "Bypass Road",
      lat: 17.263,
      lng: 80.165,
    },
  ];

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const idempotencyKey = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const payload = {
        customerId: user?.id || "30000000-0000-0000-0000-000000000001",
        fulfillmentMode: "SHARED_DELIVERY",
        deliveryAddress: deliveryAddress,
        deliveryLocality: locality,
        deliveryLatitude: deliveryLatitude,
        deliveryLongitude: deliveryLongitude,
        customerNotes: instructions || undefined,
        paymentReference: paymentMethod,
        idempotencyKey,
        suborders: Object.values(merchantGroups).map((g) => ({
          merchantId: g.merchantId,
          items: g.items.map((i) => ({
            productId: i.productId,
            productName: i.name,
            quantity: i.quantity,
            unitPrice: i.price,
          })),
        })),
      };

      const res = await api.post<any>("/orders", payload, {
        headers: { "Idempotency-Key": idempotencyKey },
      });

      const orderId = res.data?.id || res.data?.order?.id;
      if (res.success && orderId) {
        if (paymentMethod === "ONLINE") {
          // Initialize and verify online payment transaction
          await api.post<any>("/payments/create-order", {
            orderId,
            amount: finalTotal,
            paymentMethod: "UPI"
          });
          await api.post<any>("/payments/verify", {
            orderId,
            paymentId: `pay_upi_${Date.now()}`
          });
        }

        clearCart();
        router.push(`/customer/orders/${orderId}`);
      } else {
        setErrorMsg(res.error?.message || "Failed to place order. Please try again.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while placing your order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-4">
        <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto" />
        <h2 className="text-xl font-bold text-neutral-900">Your basket is empty</h2>
        <p className="text-xs text-neutral-500">Please add items before proceeding to checkout.</p>
        <Link
          href="/customer/explore"
          className="inline-block px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold"
        >
          Explore Khammam Shops
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/customer/cart"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cart</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Checkout & Confirm Order
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Review your multi-store shipment and confirm delivery details in Khammam.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Delivery Details & Payment */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Delivery Address Selection */}
          <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0F766E]" />
                <h2 className="text-sm font-bold text-neutral-950">Delivery Address in Khammam</h2>
              </div>
              <span className="text-3xs font-extrabold text-[#0F766E] uppercase bg-teal-50 px-2 py-0.5 rounded">
                Sector 01
              </span>
            </div>

            {/* Quick Address Pills */}
            <div className="space-y-2">
              <span className="text-3xs font-extrabold uppercase tracking-wider text-neutral-400 block">
                Saved Locations
              </span>
              <div className="grid grid-cols-1 gap-2">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.label}
                    type="button"
                    onClick={() => {
                      setDeliveryAddress(addr.address);
                      setLocality(addr.locality);
                      setDeliveryLatitude(addr.lat);
                      setDeliveryLongitude(addr.lng);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all min-h-[48px] flex items-start justify-between gap-3 ${
                      deliveryAddress === addr.address
                        ? "border-[#0F766E] bg-teal-50/50 ring-1 ring-[#0F766E]"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-neutral-900 block">{addr.label}</span>
                      <span className="text-3xs text-neutral-500 mt-0.5 block">{addr.address}</span>
                    </div>
                    {deliveryAddress === addr.address && (
                      <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Address Edit */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-neutral-700 block" htmlFor="delivAddr">
                Specific Door No. / Street Details
              </label>
              <textarea
                id="delivAddr"
                required
                rows={2}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>

            {/* Delivery Instructions */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block" htmlFor="instructions">
                Rider Instructions (Optional)
              </label>
              <input
                id="instructions"
                type="text"
                placeholder="e.g. Ring the calling bell, leave at reception"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>
          </div>

          {/* 2. Payment Method */}
          <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-neutral-950">Payment Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH_ON_DELIVERY")}
                className={`p-4 rounded-xl border text-left transition-all min-h-[48px] flex items-center justify-between ${
                  paymentMethod === "CASH_ON_DELIVERY"
                    ? "border-[#0F766E] bg-teal-50/50 ring-1 ring-[#0F766E]"
                    : "border-neutral-200 hover:border-neutral-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Banknote className="w-5 h-5 text-emerald-700" />
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">Cash on Delivery</span>
                    <span className="text-3xs text-neutral-500">Pay at doorstep upon PIN verification</span>
                  </div>
                </div>
                {paymentMethod === "CASH_ON_DELIVERY" && (
                  <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("ONLINE")}
                className={`p-4 rounded-xl border text-left transition-all min-h-[48px] flex items-center justify-between ${
                  paymentMethod === "ONLINE"
                    ? "border-[#0F766E] bg-teal-50/50 ring-1 ring-[#0F766E]"
                    : "border-neutral-200 hover:border-neutral-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-teal-700" />
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">UPI / Card</span>
                    <span className="text-3xs text-neutral-500">Instant digital settlement (Demo)</span>
                  </div>
                </div>
                {paymentMethod === "ONLINE" && (
                  <CheckCircle2 className="w-4 h-4 text-[#0F766E] shrink-0" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Order Items Summary & Place Order */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-5">
            <h2 className="text-base font-bold text-neutral-950">Shipment Items</h2>

            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
              {groups.map((g) => (
                <div key={g.merchantId} className="space-y-1.5 pb-3 border-b border-neutral-100 last:border-b-0">
                  <span className="text-3xs font-extrabold uppercase text-[#0F766E] block">
                    {g.merchantName}
                  </span>
                  {g.items.map((i) => (
                    <div key={i.productId} className="flex items-center justify-between text-xs text-neutral-700">
                      <span>{i.quantity}x {i.name}</span>
                      <strong className="text-neutral-900">₹{((Number(i.price) || 0) * (Number(i.quantity) || 1)).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-3 border-t border-neutral-100 text-xs text-neutral-600">
              <div className="flex items-center justify-between">
                <span>Subtotal ({items.length} items)</span>
                <span>₹{(Number(totalAmount) || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Shared Delivery Fee</span>
                <span>₹{(Number(deliveryFee) || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Platform & Convenience Fee</span>
                <span>₹{(Number(platformFee) || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              <div>
                <span className="text-3xs font-bold uppercase text-neutral-400 block">Total Due</span>
                <span className="text-2xl font-black text-neutral-950">₹{(Number(finalTotal) || 0).toFixed(2)}</span>
              </div>
              <span className="text-3xs font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                {paymentMethod === "CASH_ON_DELIVERY" ? "COD at Doorstep" : "Prepaid"}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] disabled:bg-neutral-400 text-white text-xs font-extrabold shadow-sm transition-colors flex items-center justify-center gap-2 min-h-[48px]"
            >
              {isSubmitting ? (
                <span>Locking in Shared Batch...</span>
              ) : (
                <>
                  <span>Place Order & Generate PIN</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-3xs text-neutral-500 space-y-1">
            <span className="font-bold text-neutral-700 block">Proof of Delivery (POD) Protection:</span>
            <p>
              Your order confirmation screen will generate a unique 4-digit PIN. Only share this PIN with the delivery rider once you have physically received and verified your packages.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
