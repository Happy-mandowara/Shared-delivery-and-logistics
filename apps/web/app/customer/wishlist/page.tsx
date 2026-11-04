"use client";

import React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Store, ArrowRight, ShoppingBag, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart-context";
import { api } from "@/lib/api-client";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function CustomerWishlistPage() {
  const { addItem, openCart } = useCart();
  const queryClient = useQueryClient();

  const { data: wishlistData, isLoading } = useQuery({
    queryKey: ["customer-wishlist"],
    queryFn: async () => {
      const res = await api.get<any>("/customer/wishlist");
      return res.data?.wishlist || [];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/customer/wishlist/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-wishlist"] });
    },
  });

  const savedItems = wishlistData || [];

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

      {isLoading ? (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 space-y-3">
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : savedItems.length === 0 ? (
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
          {savedItems.map((item: any) => (
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
                    onClick={() => removeMutation.mutate(item.id)}
                    disabled={removeMutation.isPending}
                    className="p-1 text-neutral-400 hover:text-rose-600 rounded"
                    title="Remove from Saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {item.imageUrl && (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-neutral-200"
                    />
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 leading-snug">
                      {item.name}
                    </h3>
                    <span className="text-3xs text-teal-800 font-semibold block mt-0.5">
                      Sold by {item.merchantName} ({item.merchantLocality || "Khammam"})
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-lg font-black text-neutral-900">
                  ₹{Number(item.price).toFixed(2)}
                </span>
                <button
                  onClick={() => {
                    addItem({
                      id: item.id,
                      name: item.name,
                      price: Number(item.price),
                      shopId: item.merchantId,
                      shopName: item.merchantName || "Local Merchant",
                      imageUrl: item.imageUrl,
                      quantity: 1,
                      handlingTag: item.handlingTag,
                    });
                    openCart();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
