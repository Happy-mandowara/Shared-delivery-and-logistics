"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  Store, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { useCart } from "@/components/cart-context";

export default function CustomerCartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart, totalAmount, subtotalByMerchant } = useCart();

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

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Multi-Store Shopping Basket
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            {items.length === 0
              ? "Your basket is currently empty"
              : `${items.length} items from ${groups.length} Khammam shop(s)`}
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 p-2 min-h-[44px]"
          >
            Clear Basket
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-950">Your basket is empty</h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Add hot meals from Bawarchi or fresh groceries from Sri Balaji to experience shared delivery.
          </p>
          <Link
            href="/customer/explore"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0F766E] text-white text-xs font-bold shadow-xs min-h-[48px]"
          >
            <span>Explore Khammam Shops</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Items grouped by Merchant */}
          <div className="lg:col-span-7 space-y-6">
            {groups.map((group) => {
              const merchantSubtotal = group.items.reduce(
                (sum, i) => sum + i.price * i.quantity,
                0
              );
              return (
                <div
                  key={group.merchantId}
                  className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs"
                >
                  {/* Merchant Group Header */}
                  <div className="p-4 bg-neutral-50/80 border-b border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 text-[#0F766E] flex items-center justify-center font-bold text-xs">
                        <Store className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-neutral-900 block">
                          {group.merchantName}
                        </span>
                        <span className="text-3xs text-neutral-500">
                          Independent Suborder · Khammam
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-[#0F766E]">
                      ₹{(Number(merchantSubtotal) || 0).toFixed(2)}
                    </span>
                  </div>

                  {/* Merchant Items */}
                  <div className="p-4 divide-y divide-neutral-100">
                    {group.items.map((item) => (
                      <div
                        key={item.productId}
                        className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-sm font-bold text-neutral-900 block truncate">
                            {item.name}
                          </span>
                          <span className="text-xs font-black text-neutral-700">
                            ₹{(Number(item.price) || 0).toFixed(2)} each
                          </span>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-bold text-neutral-800 hover:bg-neutral-200 min-h-[32px] min-w-[32px]"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-black">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-[#0F766E] text-white flex items-center justify-center font-bold hover:bg-[#0D625C] min-h-[32px] min-w-[32px]"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="p-2 text-neutral-400 hover:text-rose-600 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="Remove Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Order Summary & Checkout */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-5">
              <h2 className="text-base font-bold text-neutral-950">
                Shared Delivery Summary
              </h2>

              <div className="space-y-3 text-xs text-neutral-600 pb-4 border-b border-neutral-100">
                <div className="flex items-center justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-neutral-900">₹{(Number(totalAmount) || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shared Batch Delivery Fee</span>
                  <span className="font-bold text-neutral-900">₹{(Number(deliveryFee) || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Platform Fee</span>
                  <span className="font-bold text-neutral-900">₹{(Number(platformFee) || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-3xs uppercase font-extrabold tracking-wider text-neutral-400 block">
                    Total Amount
                  </span>
                  <span className="text-2xl font-black text-neutral-950">
                    ₹{(Number(finalTotal) || 0).toFixed(2)}
                  </span>
                </div>
                <span className="text-3xs font-extrabold px-2 py-1 rounded bg-teal-50 text-[#0F766E]">
                  {groups.length} Shipped in 1 Run
                </span>
              </div>

              <Link
                href="/customer/checkout"
                className="w-full py-4 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-extrabold transition-colors flex items-center justify-center gap-2 min-h-[48px] shadow-xs"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Shared Delivery Guarantee */}
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs text-[#0F766E] space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Single Coordinated Delivery</span>
              </div>
              <p className="text-neutral-600 text-3xs leading-relaxed">
                One verified delivery partner will pick up from all {groups.length} store(s) and bring them directly to your door with 4-digit PIN confirmation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
