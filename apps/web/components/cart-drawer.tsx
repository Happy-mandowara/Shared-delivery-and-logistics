"use client";

import React from "react";
import { useCart } from "./cart-context";
import { 
  X, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  Store, 
  ArrowRight, 
  Check, 
  Layers,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CartDrawerProps {
  onCheckout: () => void;
}

export function CartDrawer({ onCheckout }: CartDrawerProps) {
  const {
    items,
    itemCount,
    subtotal,
    deliveryFee,
    total,
    merchantGroups,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-2xs transition-opacity duration-300"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0F766E] flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 leading-tight">
                  Shared Delivery Basket
                </h2>
                <p className="text-xs text-neutral-500">
                  {itemCount} {itemCount === 1 ? "item" : "items"} from {merchantGroups.length}{" "}
                  {merchantGroups.length === 1 ? "local shop" : "local shops"}
                </p>
              </div>
            </div>

            <button
              onClick={closeCart}
              className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close basket"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Contents */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-neutral-500">
                <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-300 mb-3">
                  <ShoppingBag className="w-8 h-8 stroke-1" />
                </div>
                <h3 className="text-sm font-bold text-neutral-800">Your basket is empty</h3>
                <p className="text-xs text-neutral-500 max-w-xs mt-1">
                  Browse Khammam shops to add biryani, groceries, or sweets into one delivery batch.
                </p>
                <Button variant="secondary" className="mt-5" onClick={closeCart}>
                  Browse Local Shops
                </Button>
              </div>
            ) : (
              <>
                {/* Multi-Merchant Explanation Banner */}
                {merchantGroups.length > 1 && (
                  <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-start gap-2.5">
                    <Layers className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold">Multi-Vendor Shared Batch: </span>
                      One delivery partner will collect your items from {merchantGroups.length}{" "}
                      different shops across Khammam and deliver them together in one trip.
                    </div>
                  </div>
                )}

                {/* Suborders Grouped by Merchant */}
                {merchantGroups.map((group) => (
                  <div
                    key={group.merchantId}
                    className="border border-neutral-200 rounded-xl p-3.5 bg-neutral-50/50"
                  >
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-neutral-200">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-teal-700" />
                        <div>
                          <div className="font-bold text-xs text-neutral-900">
                            {group.merchantName}
                          </div>
                          {group.merchantLocality && (
                            <div className="text-[10px] text-neutral-500">
                              {group.merchantLocality}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-neutral-900">
                        Subtotal: ₹{group.subtotal.toFixed(2)}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-neutral-200/80 shadow-2xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-neutral-900 truncate">
                              {item.name}
                            </div>
                            <div className="text-xs text-neutral-500 mt-0.5">
                              ₹{item.price.toFixed(2)} each
                            </div>
                            {item.handlingTag && (
                              <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700">
                                {item.handlingTag.replace("_", " ")}
                              </span>
                            )}
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-lg">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center text-neutral-700 hover:bg-white rounded transition-colors cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-neutral-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center text-neutral-700 hover:bg-white rounded transition-colors cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Line total & remove */}
                          <div className="text-right">
                            <div className="text-xs font-bold text-neutral-900">
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </div>
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="text-[10px] text-red-600 hover:underline mt-1 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <button
                    onClick={clearCart}
                    className="text-xs text-neutral-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear basket
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer & Checkout */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-neutral-200 bg-neutral-50 space-y-3">
              <div className="space-y-1.5 text-xs text-neutral-600">
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-neutral-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    Shared Delivery Fee
                    <span className="text-[10px] px-1 py-0.2 bg-teal-100 text-teal-800 rounded font-mono font-medium">
                      DEMO
                    </span>
                  </span>
                  <span className="font-semibold text-neutral-900">₹{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-neutral-200 flex justify-between text-sm font-bold text-neutral-900">
                  <span>Estimated Total</span>
                  <span className="text-teal-800">₹{total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full text-sm font-bold flex items-center justify-center gap-2 py-3 shadow-md"
                onClick={() => {
                  closeCart();
                  onCheckout();
                }}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

