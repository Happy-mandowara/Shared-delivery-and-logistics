"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Package, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { ImageUploader } from "@/components/ui/image-uploader";

interface ProductVariant {
  name: string;
  price: number;
}

export default function MerchantEditProductPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const productId = params?.productId as string;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Restaurants");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("150");
  const [unit, setUnit] = useState("piece");
  const [weightGrams, setWeightGrams] = useState("");
  const [handling, setHandling] = useState("STANDARD");
  const [stockStatus, setStockStatus] = useState("IN_STOCK");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const { data: productData, isLoading } = useQuery({
    queryKey: ["merchant-edit-product", productId],
    queryFn: async () => {
      const res = await api.get<any>(`/products/${productId}`);
      return res.data?.product || null;
    },
    enabled: Boolean(productId),
  });

  useEffect(() => {
    if (productData) {
      setName(productData.name || "");
      setCategory(productData.category || "Restaurants");
      setDescription(productData.description || "");
      setPrice(String(productData.price || ""));
      setUnit(productData.unit || "piece");
      setWeightGrams(productData.weight_grams ? String(productData.weight_grams) : "");
      setHandling(productData.handling_requirements || "STANDARD");
      setStockStatus(productData.stock_status || "IN_STOCK");

      // Populate images
      if (Array.isArray(productData.image_urls) && productData.image_urls.length > 0) {
        setImageUrls(productData.image_urls);
      } else if (productData.image_url) {
        setImageUrls([productData.image_url]);
      } else {
        setImageUrls([]);
      }

      // Populate variants
      if (Array.isArray(productData.variants)) {
        setVariants(productData.variants);
      } else {
        setVariants([]);
      }
    }
  }, [productData]);

  const addVariant = () => {
    setVariants([...variants, { name: "", price: parseFloat(price) || 0 }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: "name" | "price", val: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: field === "price" ? parseFloat(val) || 0 : val };
    setVariants(updated);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const validVariants = variants.filter(v => v.name.trim() !== "");
      const res = await api.patch<any>(`/products/${productId}`, {
        name,
        category,
        description,
        price: parseFloat(price),
        unit,
        weight_grams: weightGrams ? parseInt(weightGrams) : null,
        handling_requirements: handling,
        stock_status: stockStatus,
        image_url: imageUrls[0] || null,
        image_urls: imageUrls,
        variants: validVariants.length > 0 ? validVariants : [],
      });
      return res.data;
    },
    onSuccess: () => {
      setSavedSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["merchant-products-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["merchant-edit-product", productId] });
      setTimeout(() => router.push("/merchant/products"), 1500);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to update product.");
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-8 rounded-3xl bg-white border border-neutral-200 animate-pulse h-96" />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/merchant/products"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Product List</span>
      </Link>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-neutral-950 tracking-tight">
            Edit Product
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Update pricing, multi-image gallery, unit constraints, and variants.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Product updated successfully! Redirecting...</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
          className="space-y-6"
        >
          {/* Photos Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-900 block">
              Product Photographs & Gallery
            </label>
            <p className="text-3xs text-neutral-500">
              Drag-and-drop or select pictures. Reorder or click cover badge to choose thumbnail.
            </p>
            <ImageUploader
              value={imageUrls}
              onChange={setImageUrls}
              maxImages={6}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-900 block" htmlFor="pName">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="pName"
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="pCat">
                Category
              </label>
              <select
                id="pCat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[44px]"
              >
                <option value="Restaurants">Restaurants & Hot Food</option>
                <option value="Groceries">Groceries & Kirana</option>
                <option value="Dairy">Dairy & Milk</option>
                <option value="Produce">Produce & Vegetables</option>
                <option value="Pharmacy">Pharmacy & Essentials</option>
                <option value="Sweets">Sweets & Snacks</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="pPrice">
                Price in ₹ (INR) <span className="text-rose-500">*</span>
              </label>
              <input
                id="pPrice"
                required
                type="number"
                step="0.5"
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="pUnit">
                Unit
              </label>
              <select
                id="pUnit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[44px]"
              >
                <option value="piece">Per Piece</option>
                <option value="plate">Per Plate</option>
                <option value="kg">Per Kilogram (kg)</option>
                <option value="gram">Per 100g / 500g</option>
                <option value="litre">Per Litre</option>
                <option value="packet">Per Packet / Box</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-900 block" htmlFor="pDesc">
              Item Description
            </label>
            <textarea
              id="pDesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          {/* Variants Builder */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-900 block">Product Variants & Sizes</span>
                <span className="text-3xs text-neutral-500">Optional: Offer portion sizes like Single, Full, or Family Pack.</span>
              </div>
              <button
                type="button"
                onClick={addVariant}
                className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 text-xs font-bold text-[#0F766E] hover:bg-neutral-100 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variant</span>
              </button>
            </div>

            {variants.length > 0 && (
              <div className="space-y-2 pt-2">
                {variants.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Single / Full / 500ml"
                      value={v.name}
                      onChange={(e) => updateVariant(idx, "name", e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:ring-2 focus:ring-[#0F766E]"
                    />
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">₹</span>
                      <input
                        type="number"
                        placeholder="Price"
                        value={v.price}
                        onChange={(e) => updateVariant(idx, "price", e.target.value)}
                        className="w-full pl-7 pr-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:ring-2 focus:ring-[#0F766E]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariant(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                      title="Remove variant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="pHandling">
                Special Handling Requirements
              </label>
              <select
                id="pHandling"
                value={handling}
                onChange={(e) => setHandling(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[44px]"
              >
                <option value="STANDARD">Standard Packaging</option>
                <option value="HOT_FOOD">Hot Food (Thermal pouch)</option>
                <option value="FRAGILE">Fragile (Careful two-wheeler handling)</option>
                <option value="COLD_CHAIN">Cold Chain (Milk / Ice Cream)</option>
                <option value="PERISHABLE">Perishable Produce</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="pStock">
                Stock Status
              </label>
              <select
                id="pStock"
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[44px]"
              >
                <option value="IN_STOCK">In Stock</option>
                <option value="CALL_TO_CONFIRM">Call to confirm</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="pWeight">
                Estimated Weight (Grams)
              </label>
              <input
                id="pWeight"
                type="number"
                placeholder="e.g. 750"
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <Link
              href="/merchant/products"
              className="px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 min-h-[44px] flex items-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{updateMutation.isPending ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
