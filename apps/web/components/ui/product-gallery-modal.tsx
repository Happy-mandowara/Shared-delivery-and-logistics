"use client";

import React, { useState } from "react";
import { 
  X, 
  Heart, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Check, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  Flame,
  AlertTriangle,
  Store
} from "lucide-react";
import { useCart } from "@/components/cart-context";
import { api } from "@/lib/api-client";

interface ProductVariant {
  name: string;
  price: number;
  unit?: string;
  stockStatus?: string;
}

export interface ProductModalData {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  imageUrl?: string;
  imageUrls?: string[];
  unit?: string;
  variants?: ProductVariant[];
  weightGrams?: number;
  handlingTag?: string;
  stockStatus?: string;
  stockConfirmedAt?: string;
  merchantId: string;
  merchantName?: string;
  merchantLocality?: string;
}

interface ProductGalleryModalProps {
  product: ProductModalData | null;
  onClose: () => void;
  isWishlisted?: boolean;
  onWishlistToggle?: (productId: string, nextState: boolean) => void;
}

export function ProductGalleryModal({
  product,
  onClose,
  isWishlisted = false,
  onWishlistToggle,
}: ProductGalleryModalProps) {
  const { addItem } = useCart();
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [wishlistState, setWishlistState] = useState(isWishlisted);
  const [addedAnimation, setAddedAnimation] = useState(false);

  if (!product) return null;

  const images = product.imageUrls && product.imageUrls.length > 0 
    ? product.imageUrls 
    : product.imageUrl 
    ? [product.imageUrl] 
    : ["https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80"];

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name,
      price: currentPrice,
      shopId: product.merchantId,
      shopName: product.merchantName || "Local Merchant",
      imageUrl: images[0],
      quantity: quantity,
      handlingTag: product.handlingTag,
    });
    setAddedAnimation(true);
    setTimeout(() => {
      setAddedAnimation(false);
      onClose();
    }, 800);
  };

  const toggleWishlist = async () => {
    const next = !wishlistState;
    setWishlistState(next);
    if (onWishlistToggle) {
      onWishlistToggle(product.id, next);
    }
    try {
      if (next) {
        await api.post("/customer/wishlist", { productId: product.id });
      } else {
        await api.delete(`/customer/wishlist/${product.id}`);
      }
    } catch (e) {
      // Revert if error
      setWishlistState(!next);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-neutral-200 my-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-xs transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Wishlist button */}
          <button
            onClick={toggleWishlist}
            className={`absolute top-4 left-4 z-20 w-9 h-9 rounded-full backdrop-blur-xs flex items-center justify-center transition-transform active:scale-90 ${
              wishlistState ? "bg-rose-500 text-white" : "bg-black/60 hover:bg-black text-white"
            }`}
          >
            <Heart className={`w-5 h-5 ${wishlistState ? "fill-white" : ""}`} />
          </button>

          {/* Main Selected Image */}
          <div className="aspect-16/10 sm:aspect-16/9 bg-neutral-900 relative overflow-hidden">
            <img
              src={images[selectedImageIdx] || images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
            {product.handlingTag && product.handlingTag !== "STANDARD" && (
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-xs text-white text-3xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 border border-white/10">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{product.handlingTag.replace(/_/g, " ")}</span>
              </div>
            )}
          </div>

          {/* Thumbnail Gallery Strip */}
          {images.length > 1 && (
            <div className="px-4 py-3 bg-neutral-100 flex items-center gap-2 overflow-x-auto border-b border-neutral-200">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    selectedImageIdx === idx ? "border-[#0F766E] scale-105 shadow-sm" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details Content */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-3xs font-extrabold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                {product.category}
              </span>
              <div className="flex items-center gap-1.5 text-3xs font-bold text-neutral-500">
                <Store className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>{product.merchantName || "Verified Khammam Merchant"}</span>
              </div>
            </div>

            <h2 className="text-2xl font-black text-neutral-950 tracking-tight">
              {product.name}
            </h2>

            {product.description && (
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {/* Freshness Status & Handling Pill */}
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                product.stockStatus === "OUT_OF_STOCK" 
                  ? "bg-rose-500" 
                  : product.stockStatus === "CALL_TO_CONFIRM" 
                  ? "bg-amber-500" 
                  : "bg-emerald-500"
              }`} />
              <span className="font-bold text-neutral-800">
                {product.stockStatus === "OUT_OF_STOCK" 
                  ? "Out of Stock" 
                  : product.stockStatus === "CALL_TO_CONFIRM" 
                  ? "Call to Confirm" 
                  : "In Stock & Ready"}
              </span>
            </div>
            <span className="text-3xs text-neutral-500 font-medium">
              Unit: {product.unit || "piece"}
            </span>
          </div>

          {/* Variants Selector (if available) */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-800 block">Select Size / Portion</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {product.variants.map((v, idx) => {
                  const isSelected = selectedVariant?.name === v.name;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedVariant(isSelected ? null : v)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected 
                          ? "border-[#0F766E] bg-teal-50/40 text-teal-950 ring-1 ring-[#0F766E]" 
                          : "border-neutral-200 bg-white hover:border-neutral-300 text-neutral-800"
                      }`}
                    >
                      <span className="font-bold text-xs block">{v.name}</span>
                      <span className="text-3xs text-neutral-500 mt-0.5 block">₹{Number(v.price).toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price & Add to Cart Footer */}
          <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-3xs uppercase font-extrabold text-neutral-400 block tracking-wider">Total Price</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-neutral-950">
                  ₹{(currentPrice * quantity).toFixed(2)}
                </span>
                <span className="text-xs text-neutral-500">
                  (₹{currentPrice.toFixed(2)} × {quantity})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quantity Stepper */}
              <div className="flex items-center border border-neutral-200 rounded-xl bg-neutral-50 overflow-hidden min-h-[48px]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-neutral-700 hover:bg-neutral-200 min-h-[48px] min-w-[44px] flex items-center justify-center font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-3 font-black text-sm text-neutral-900 min-w-[32px] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2 text-neutral-700 hover:bg-neutral-200 min-h-[48px] min-w-[44px] flex items-center justify-center font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Cart button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stockStatus === "OUT_OF_STOCK"}
                className={`flex-1 sm:flex-initial px-6 py-3 rounded-xl text-xs font-black min-h-[48px] flex items-center justify-center gap-2 transition-all ${
                  addedAnimation 
                    ? "bg-emerald-600 text-white" 
                    : "bg-[#0F766E] hover:bg-[#0D625C] disabled:bg-neutral-300 text-white shadow-xs"
                }`}
              >
                {addedAnimation ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Multi-Shop Cart</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
