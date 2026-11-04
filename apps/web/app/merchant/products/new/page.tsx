"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";

export default function MerchantCreateProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Restaurants");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("150");
  const [handling, setHandling] = useState("STANDARD");
  const [stockStatus, setStockStatus] = useState("IN_STOCK");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.post<any>("/products", {
        name,
        category,
        description,
        price: parseFloat(price),
        handling_requirements: handling,
        stock_status: stockStatus,
      });

      if (res.data?.success) {
        router.push("/merchant/products");
      } else {
        setErrorMsg(res.data?.error?.message || "Failed to create product.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
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
            Add New Product
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Create a new item in your Khammam store catalog with authoritative pricing.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-900 block" htmlFor="pName">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="pName"
              required
              type="text"
              placeholder="e.g. Chicken 65 (Full Plate)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block" htmlFor="pCat">
                Category <span className="text-rose-500">*</span>
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
                placeholder="150"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-900 block" htmlFor="pDesc">
              Item Description
            </label>
            <textarea
              id="pDesc"
              rows={3}
              placeholder="Crispy fried spicy chicken with curry leaves and green chillies."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                Initial Stock Status
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
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors min-h-[44px]"
            >
              {isSubmitting ? "Saving Product..." : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
