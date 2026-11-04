"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart, Store, ArrowRight, ShoppingBag, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart-context";

export default function CustomerWishlistPage() {
  const { addItem, openCart } = useCart();
  const [savedItems, setSavedItems] = useState([
    {
      id: "prod-bawarchi-1",
      name: "Special Chicken Dum Biryani (Single Pack)",
      merchantId: "10000000-0000-0000-0000-000000000001",
      merchantName: "Bawarchi Restaurant",
      price: 240,
      category: "Restaurants",
      locality: "Wyra Road"
    },
    {
      id: "prod-balaji-1",
      name: "Heritage Full Cream Milk (500ml)",
      merchantId: "10000000-0000-0000-0000-000000000002",
      merchantName: "Sri Balaji Supermarket",
      price: 36,
      category: "Dairy",
      locality: "Bus Stand Road"
    }
  ]);

  const handleRemove = (id: string) => {
    setSavedItems(savedItems.filter(i => i.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Saved Favourites
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Your bookmarked products and stores in Khammam for quick re-ordering.
        </p>
      </div>

      {savedItems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-4">
          <Heart className="w-12 h-12 text-neutral-300 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">No saved items yet</h2>
          <p className="text-xs text-neutral-500">Bookmark products or stores while browsing to see them here.</p>
          <Link
            href="/customer/explore"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold"
          >
            Explore Khammam Shops
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {savedItems.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                    {item.category}
                  </span>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-1 text-neutral-400 hover:text-rose-600 rounded"
                    title="Remove from Saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-neutral-900 leading-snug">
                  {item.name}
                </h3>
                <span className="text-xs text-teal-800 font-semibold block mt-1">
                  Sold by {item.merchantName} ({item.locality})
                </span>
              </div>

              <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-lg font-black text-neutral-900">
                  ₹{item.price.toFixed(2)}
                </span>
                <button
                  onClick={() => {
                    addItem({
                      productId: item.id,
                      merchantId: item.merchantId,
                      merchantName: item.merchantName,
                      name: item.name,
                      price: item.price,
                      quantity: 1,
                    });
                    openCart();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[40px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Order</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
