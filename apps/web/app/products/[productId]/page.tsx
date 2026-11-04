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
  AlertCircle,
  Heart,
  Package
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { api } from "@/lib/api-client";
import { useCart } from "@/components/cart-context";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.productId as string;
  const { addItem, updateQuantity, items: cartItems, openCart } = useCart();
  const [qty, setQty] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);

  const { data: productData, isLoading, isError } = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: async () => {
      if (!productId || typeof productId !== "string") return null;
      const res = await api.get<any>(`/products/${productId}`);
      return res.data?.product || null;
    },
    enabled: Boolean(productId),
  });

  // Check wishlist status
  useQuery({
    queryKey: ["product-wishlist-status", productId],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/customer/wishlist");
        const list = res.data?.wishlist || [];
        const found = list.some((item: any) => item.id === productId || item.productId === productId);
        setIsWishlisted(found);
        return found;
      } catch {
        return false;
      }
    },
    enabled: Boolean(productId),
  });

  const toggleWishlist = async () => {
    const nextState = !isWishlisted;
    setIsWishlisted(nextState);
    try {
      if (nextState) {
        await api.post("/customer/wishlist", { productId });
      } else {
        await api.delete(`/customer/wishlist/${productId}`);
      }
    } catch {
      setIsWishlisted(!nextState);
    }
  };

  const product = productData;
  const inCart = cartItems.find((i) => i.productId === productId);

  const images: string[] = product?.image_urls && product.image_urls.length > 0
    ? product.image_urls
    : product?.image_url
    ? [product.image_url]
    : [];

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
          <div className="p-8 rounded-3xl bg-white border border-neutral-200 animate-pulse h-96" />
        ) : !product || isError ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-4">
            <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto" />
            <h2 className="text-xl font-bold text-neutral-900">Product not found</h2>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              This item is no longer available or was removed from the Khammam merchant catalog.
            </p>
            <div className="pt-2">
              <Link
                href="/explore"
                className="inline-block px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold min-h-[44px]"
              >
                Browse other Khammam items
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Product Media Gallery */}
              <div className="md:col-span-5 space-y-3">
                <div className="w-full h-72 rounded-2xl bg-neutral-100 overflow-hidden relative border border-neutral-200/80 shadow-2xs">
                  <ImageWithFallback
                    src={images[selectedImgIdx] || images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    fallbackIcon={<Package className="w-16 h-16 text-neutral-300" />}
                  />
                  <button
                    onClick={toggleWishlist}
                    className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md shadow-sm transition-transform active:scale-95 ${
                      isWishlisted
                        ? "bg-rose-50 text-rose-600 border border-rose-200"
                        : "bg-white/90 text-neutral-600 hover:text-rose-500"
                    }`}
                    title={isWishlisted ? "Remove from favourites" : "Add to favourites"}
                  >
                    <Heart className={`w-5 h-5 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>
                </div>

                {images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImgIdx(idx)}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                          selectedImgIdx === idx ? "border-[#0F766E] shadow-xs" : "border-neutral-200 opacity-70"
                        }`}
                      >
                        <ImageWithFallback
                          src={img}
                          alt={`${product.name} thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info & Pricing */}
              <div className="md:col-span-7 space-y-5">
                <div className="space-y-2">
                  <span className="text-3xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E]">
                    {product.category || "General"}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight leading-tight">
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

                <div className="pb-3 border-b border-neutral-100 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-neutral-950">
                    ₹{Number(product.price).toFixed(2)}
                  </span>
                  {product.unit && (
                    <span className="text-xs text-neutral-500 font-bold">
                      per {product.unit}
                    </span>
                  )}
                </div>

                {/* Description */}
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 text-xs sm:text-sm text-neutral-700 leading-relaxed">
                  {product.description || "Authentic item prepared fresh and packed with care in Khammam."}
                </div>

                {/* Handling & Availability Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-neutral-200">
                    <span className="text-3xs uppercase font-bold text-neutral-400 block mb-1">Freshness</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${product.stock_status === "IN_STOCK" ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <span className="text-xs font-bold text-neutral-900">
                        {product.stock_status === "IN_STOCK" ? "In Stock & Ready" : "Call to confirm"}
                      </span>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-neutral-200">
                    <span className="text-3xs uppercase font-bold text-neutral-400 block mb-1">Handling</span>
                    <span className="text-xs font-bold text-neutral-900 capitalize">
                      {product.handling_requirements?.toLowerCase().replace(/_/g, " ") || "Standard Handling"}
                    </span>
                  </div>
                </div>

                {/* Add to Cart Actions */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <span className="text-xs font-bold text-neutral-600">Qty:</span>
                    <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-xl">
                      <button
                        onClick={() => setQty(Math.max(1, qty - 1))}
                        className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-bold text-neutral-800 hover:bg-neutral-200 min-h-[32px] min-w-[32px]"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-extrabold">{qty}</span>
                      <button
                        onClick={() => setQty(qty + 1)}
                        className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-bold text-neutral-800 hover:bg-neutral-200 min-h-[32px] min-w-[32px]"
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
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 min-h-[44px] shadow-xs"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add {qty} to Order (₹{(Number(product.price) * qty).toFixed(2)})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
