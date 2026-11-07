"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  Store, 
  MapPin, 
  Clock, 
  Phone, 
  ArrowLeft, 
  Plus, 
  Minus, 
  ShoppingBag, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ShieldCheck,
  Search,
  Package,
  Heart
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@nationx/shared";
import { useCart } from "@/components/cart-context";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { ProductGalleryModal } from "@/components/ui/product-gallery-modal";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

export default function ShopStorefrontPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = params?.shopSlug as string;
  const { addItem, updateQuantity, items: cartItems, openCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductForModal, setSelectedProductForModal] = useState<any | null>(null);

  // 1. Fetch Merchant Details
  const { data: merchantData, isLoading: isLoadingMerchant } = useQuery({
    queryKey: ["merchant-detail", shopId],
    queryFn: async () => {
      const res = await api.get<any>(`/merchants/${shopId}`);
      return res.data?.merchant || null;
    },
    enabled: Boolean(shopId),
  });

  // 2. Fetch Merchant Products
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["merchant-products", shopId, selectedCategory],
    queryFn: async () => {
      let url = `/merchants/${shopId}/products`;
      if (selectedCategory !== "ALL") {
        url += `?category=${encodeURIComponent(selectedCategory)}`;
      }
      const res = await api.get<any>(url);
      return res.data || { products: [], categories: [] };
    },
    enabled: Boolean(shopId),
  });

  // Fetch customer wishlist items for heart state
  const { data: wishlistData, refetch: refetchWishlist } = useQuery({
    queryKey: ["customer-wishlist-items"],
    queryFn: async () => {
      try {
        const res = await api.get<any>("/customer/wishlist");
        return res.data?.wishlist || [];
      } catch {
        return [];
      }
    },
  });

  const wishlistedIds = new Set((wishlistData || []).map((w: any) => w.id || w.productId));

  const toggleWishlist = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    const isSaved = wishlistedIds.has(productId);
    try {
      if (isSaved) {
        await api.delete(`/customer/wishlist/${productId}`);
      } else {
        await api.post("/customer/wishlist", { productId });
      }
      refetchWishlist();
    } catch {
      // Revert if error
    }
  };

  const merchant = merchantData;
  const products = productsData?.products || [];
  const categories = ["ALL", ...(productsData?.categories || [])];

  const filteredProducts = products.filter((p: any) => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const getItemQuantity = (productId: string) => {
    const found = cartItems.find((i) => i.productId === productId);
    return found ? found.quantity : 0;
  };

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Back Link */}
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Shops</span>
        </Link>

        {/* Shop Banner & Profile Card */}
        {isLoadingMerchant ? (
          <div className="p-8 rounded-3xl bg-white border border-neutral-200 animate-pulse h-48" />
        ) : !merchant ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200">
            <Store className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-neutral-900">Shop not found</h2>
            <p className="text-sm text-neutral-500 mt-1">This outlet may not be registered in the Khammam delivery network.</p>
            <Link
              href="/explore"
              className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold"
            >
              Return to Explore
            </Link>
          </div>
        ) : (
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-[#0F766E] overflow-hidden flex items-center justify-center font-bold text-2xl shrink-0">
                  {merchant.logoUrl ? (
                    <img
                      src={merchant.logoUrl}
                      alt={merchant.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <Store className="w-8 h-8" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
                      {merchant.name}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-3xs font-extrabold uppercase">
                      Open for Dispatch
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-600 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span>{merchant.address || "Wyra Road, Khammam"}</span>
                  </p>
                </div>
              </div>

              {/* Service Details Pill */}
              <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 text-xs text-neutral-600 bg-neutral-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                <span className="flex items-center gap-1.5 font-bold text-teal-800">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>15–25 mins prep time</span>
                </span>
                <span className="text-3xs text-neutral-500">
                  Locality: <strong className="text-neutral-700">{merchant.locality || "Central Zone"}</strong>
                </span>
              </div>
            </div>

            {/* Shared Batching Compatibility Notice */}
            <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-[#0F766E] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-[#0F766E]" />
                <span>
                  <strong>Shared Delivery Eligible:</strong> Items from {merchant.name} can be bundled with neighbouring stores along {merchant.locality || "Wyra Road"}.
                </span>
              </div>
              <button
                onClick={openCart}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0F766E] text-white text-3xs font-bold hover:bg-[#0D625C] shrink-0"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>View Cart</span>
              </button>
            </div>
          </div>
        )}

        {/* Product Filter & Search Bar */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
                    selectedCategory === cat
                      ? "bg-[#0F766E] text-white"
                      : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
                  }`}
                >
                  {cat === "ALL" ? "All Products" : cat}
                </button>
              ))}
            </div>

            {/* In-store Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search this menu..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl text-xs font-medium border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>
          </div>

          {/* Product Cards Grid */}
          {isLoadingProducts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <ProductCardSkeleton />
              <ProductCardSkeleton />
              <ProductCardSkeleton />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200">
              <ShoppingBag className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-base font-bold text-neutral-900">No items available</h3>
              <p className="text-xs text-neutral-500 mt-1">Try another category or search keyword.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((p: any) => {
                const quantity = getItemQuantity(p.id);
                const primaryImg = p.imageUrl || p.image_url || (p.imageUrls && p.imageUrls[0]) || (p.image_urls && p.image_urls[0]);
                const allImgs = (p.imageUrls && p.imageUrls.length > 0) ? p.imageUrls : (p.image_urls || (primaryImg ? [primaryImg] : []));
                return (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Product Header Badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                          {p.category || "Menu Item"}
                        </span>
                        {p.stock_status === "IN_STOCK" ? (
                          <span className="text-3xs font-bold text-emerald-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            In Stock
                          </span>
                        ) : (
                          <span className="text-3xs font-bold text-amber-700">
                            Call to confirm
                          </span>
                        )}
                      </div>

                      {/* Image Thumbnail and Details Clickable */}
                      <div 
                        onClick={() => setSelectedProductForModal(p)}
                        className="cursor-pointer space-y-3"
                      >
                        <div className="w-full h-40 rounded-xl bg-neutral-100 overflow-hidden relative border border-neutral-100 flex items-center justify-center">
                          <ImageWithFallback
                            src={primaryImg}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            fallbackIcon={<Package className="w-10 h-10 text-neutral-300" />}
                          />
                          {p.image_urls && p.image_urls.length > 1 && (
                            <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-3xs font-bold backdrop-blur-xs">
                              +{p.image_urls.length - 1} photos
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => toggleWishlist(e, p.id)}
                            className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-xs transition-transform active:scale-90 z-10 ${
                              wishlistedIds.has(p.id)
                                ? "bg-rose-50 text-rose-600 border border-rose-200"
                                : "bg-white/80 text-neutral-600 hover:text-rose-500"
                            }`}
                            title={wishlistedIds.has(p.id) ? "Remove from favourites" : "Add to favourites"}
                          >
                            <Heart className={`w-4 h-4 ${wishlistedIds.has(p.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                          </button>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-neutral-900 leading-snug group-hover:text-[#0F766E] transition-colors">
                            {p.name}
                          </h3>
                          {p.description && (
                            <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Handling Requirements & Variants Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        {p.handling_requirements && p.handling_requirements !== "STANDARD" && (
                          <span className="inline-flex items-center gap-1 text-3xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            Special: {p.handling_requirements}
                          </span>
                        )}
                        {p.unit && (
                          <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                            per {p.unit}
                          </span>
                        )}
                        {p.variants && Array.isArray(p.variants) && p.variants.length > 0 && (
                          <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            {p.variants.length} sizes/options
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price and Cart Interaction */}
                    <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between">
                      <div>
                        <span className="text-3xs text-neutral-400 block font-bold uppercase">Price</span>
                        <span className="text-lg font-black text-neutral-900">
                          {formatCurrency(p.price)}
                        </span>
                      </div>

                      {quantity === 0 ? (
                        <button
                          onClick={() => {
                            addItem({
                              productId: p.id,
                              merchantId: p.merchant_id || merchant.id,
                              merchantName: merchant.name,
                              name: p.name,
                              price: Number(p.price),
                              quantity: 1,
                            });
                          }}
                          className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[44px]"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add to Order</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl p-1">
                          <button
                            onClick={() => updateQuantity(p.id, quantity - 1)}
                            className="w-8 h-8 rounded-lg bg-white text-teal-800 flex items-center justify-center font-bold hover:bg-neutral-100 min-h-[32px] min-w-[32px]"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-extrabold text-[#0F766E] px-2 min-w-5 text-center">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(p.id, quantity + 1)}
                            className="w-8 h-8 rounded-lg bg-[#0F766E] text-white flex items-center justify-center font-bold hover:bg-[#0D625C] min-h-[32px] min-w-[32px]"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Product Gallery Modal */}
      <ProductGalleryModal
        product={selectedProductForModal}
        isOpen={Boolean(selectedProductForModal)}
        onClose={() => setSelectedProductForModal(null)}
        merchantName={merchant?.name}
      />
    </PublicLayout>
  );
}
