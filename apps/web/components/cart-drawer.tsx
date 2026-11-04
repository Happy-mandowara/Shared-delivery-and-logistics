"use client";

import React from "react";
import { useRouter } from "next/navigation";
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
  onCheckout?: () => void;
}

export function CartDrawer({ onCheckout }: CartDrawerProps) {
  const router = useRouter();
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

  const handleCheckoutClick = () => {
    closeCart();
    if (onCheckout) {
      onCheckout();
    } else {
      router.push("/customer/checkout");
    }
  };

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
          <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-teal-700" />
              <h2 className="text-base font-bold text-neutral-900">Your Shared Basket</h2>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Contents */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-neutral-500 space-y-3">
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-2">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium text-neutral-700">Your basket is currently empty.</p>
                <p className="text-xs text-neutral-500 max-w-xs">
                  Discover local merchant products in Khammam and experience coordinated shared delivery!
                </p>
              </div>
            ) : (
              <>
                {/* Batch Delivery Hint */}
                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex items-start gap-2.5 text-xs text-teal-900">
                  <Sparkles className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Shared Batch Dispatch</span>
                    <p className="text-teal-800/90 text-2xs mt-0.5">
                      Items from {merchantGroups.length} {merchantGroups.length === 1 ? "shop" : "shops"} will be
                      collected by one delivery partner along the Wyra Road corridor.
                    </p>
                  </div>
                </div>

                {/* Suborders by Merchant */}
                <div className="space-y-5">
                  {merchantGroups.map((group) => (
                    <div
                      key={group.merchantId}
                      className="border border-neutral-200 rounded-xl p-3.5 bg-neutral-50/30 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                          <Store className="w-4 h-4 text-teal-700" />
                          <span>{group.merchantName}</span>
                        </div>
                        <span className="text-xs font-semibold text-neutral-600">
                          ₹{(Number(group.subtotal) || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Items in this merchant suborder */}
                      <div className="space-y-2.5">
                        {group.items.map((item) => (
                          <div
                            key={item.productId}
                            className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-neutral-100 shadow-2xs"
                          >
                            <div className="space-y-0.5 max-w-[190px]">
                              <p className="font-medium text-neutral-900 truncate">{item.name}</p>
                              <p className="text-neutral-500 text-2xs">₹{(Number(item.price) || 0).toFixed(2)} each</p>
                            </div>

                            {/* Quantity controls */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                className="w-6 h-6 flex items-center justify-center rounded bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-bold text-xs font-mono">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                className="w-6 h-6 flex items-center justify-center rounded bg-teal-50 text-teal-700 hover:bg-teal-100 transition cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => removeItem(item.productId)}
                                className="ml-1 p-1 text-neutral-400 hover:text-red-600 transition cursor-pointer"
                                aria-label="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Clear Cart Button */}
                <div className="pt-2 flex justify-end">
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
                  <span className="font-semibold text-neutral-900">₹{(Number(subtotal) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    Shared Delivery Fee
                    <span className="text-[10px] px-1 py-0.2 bg-teal-100 text-teal-800 rounded font-mono font-medium">
                      DEMO
                    </span>
                  </span>
                  <span className="font-semibold text-neutral-900">₹{(Number(deliveryFee) || 0).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-neutral-200 flex justify-between text-sm font-bold text-neutral-900">
                  <span>Estimated Total</span>
                  <span className="text-teal-800">₹{(Number(total) || 0).toFixed(2)}</span>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full text-sm font-bold flex items-center justify-center gap-2 py-3 shadow-md"
                onClick={handleCheckoutClick}
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
