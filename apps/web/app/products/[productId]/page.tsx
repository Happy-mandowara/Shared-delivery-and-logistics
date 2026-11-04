"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Store, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { api } from "@/lib/api-client";
import { useCart } from "@/components/cart-context";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.productId as string;
  const { addItem, updateQuantity, items: cartItems, openCart } = useCart();
  const [qty, setQty] = useState(1);

  const { data: productData, isLoading } = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: async () => {
      const res = await api.get<any>(`/products/${productId}`);
      return res.data?.product || null;
    },
    enabled: Boolean(productId),
  });

  const product = productData;
  const inCart = cartItems.find((i) => i.productId === productId);

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </Link>

        {isLoading ? (
          <div className="p-8 rounded-3xl bg-white border border-neutral-200 animate-pulse h-64" />
        ) : !product ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200">
            <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-neutral-900">Product not found</h2>
            <p className="text-sm text-neutral-500 mt-1">This item might be unavailable or removed from the catalog.</p>
            <Link
              href="/explore"
              className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold"
            >
              Browse other items
            </Link>
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="space-y-2">
                <span className="text-3xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E]">
                  {product.category || "General"}
                </span>
                <h1 className="text-3xl font-black text-neutral-950 tracking-tight">
                  {product.name}
                </h1>
                {product.merchant_name && (
                  <Link
                    href={`/shops/${product.merchant_id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F766E] hover:underline"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Sold by {product.merchant_name}</span>
                  </Link>
                )}
              </div>

              <div className="text-left sm:text-right">
                <span className="text-3xs uppercase font-extrabold tracking-wider text-neutral-400 block">
                  Retail Price
                </span>
                <span className="text-3xl font-black text-neutral-950">
                  ₹{Number(product.price).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 text-sm text-neutral-700 leading-relaxed">
              {product.description || "Authentic item prepared fresh and packed with care in Khammam."}
            </div>

            {/* Handling & Availability Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-neutral-200">
                <span className="text-3xs uppercase font-bold text-neutral-400 block mb-1">Stock Freshness</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${product.stock_status === "IN_STOCK" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className="text-sm font-bold text-neutral-900">
                    {product.stock_status === "IN_STOCK" ? "In Stock & Ready" : "Call to confirm"}
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-neutral-200">
                <span className="text-3xs uppercase font-bold text-neutral-400 block mb-1">Handling Requirements</span>
                <span className="text-sm font-bold text-neutral-900 capitalize">
                  {product.handling_requirements?.toLowerCase().replace(/_/g, " ") || "Standard Handling"}
                </span>
              </div>
            </div>

            {/* Add to Cart Actions */}
            <div className="pt-6 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-bold text-neutral-600">Quantity:</span>
                <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-xl">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-9 h-9 rounded-lg bg-white flex items-center justify-center font-bold text-neutral-800 hover:bg-neutral-200 min-h-[36px] min-w-[36px]"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-extrabold">{qty}</span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="w-9 h-9 rounded-lg bg-white flex items-center justify-center font-bold text-neutral-800 hover:bg-neutral-200 min-h-[36px] min-w-[36px]"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  addItem({
                    productId: product.id,
                    merchantId: product.merchant_id,
                    merchantName: product.merchant_name || "Merchant Shop",
                    name: product.name,
                    price: Number(product.price),
                    quantity: qty,
                  });
                  openCart();
                }}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 min-h-[48px] shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add {qty} to Shared Order (₹{(Number(product.price) * qty).toFixed(2)})</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
