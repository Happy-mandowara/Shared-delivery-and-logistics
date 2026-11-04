"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { api } from "@/lib/api-client";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function MerchantProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["merchant-products-catalog"],
    queryFn: async () => {
      const res = await api.get<any>("/products");
      return res.data?.products || [];
    },
  });

  const products = productsData || [];

  const categories = ["ALL", ...Array.from(new Set(products.map((p: any) => p.category).filter(Boolean)))];

  const filtered = products.filter((p: any) => {
    const matchesCat = selectedCategory === "ALL" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Products Catalogue
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Maintain your store&apos;s product offerings, prices, and special handling attributes.
          </p>
        </div>

        <Link
          href="/merchant/products/new"
          className="px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search catalog items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-neutral-50 rounded-xl text-xs font-medium border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[40px]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat: any) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap min-h-[36px] transition-colors ${
                selectedCategory === cat ? "bg-[#0F766E] text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {cat === "ALL" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <Package className="w-12 h-12 text-neutral-300 mx-auto" />
          <h3 className="text-base font-bold text-neutral-900">No products found</h3>
          <p className="text-xs text-neutral-500">Create your first catalog product to start accepting customer orders.</p>
          <Link
            href="/merchant/products/new"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold"
          >
            Add Product Now
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs divide-y divide-neutral-100">
          {filtered.map((prod: any) => (
            <div
              key={prod.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/60 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900">{prod.name}</span>
                  <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                    {prod.category}
                  </span>
                </div>
                {prod.description && (
                  <p className="text-xs text-neutral-500 line-clamp-1 max-w-xl">{prod.description}</p>
                )}
                <div className="flex items-center gap-3 text-3xs text-neutral-400">
                  <span>Handling: <strong>{prod.handling_requirements || "STANDARD"}</strong></span>
                  <span>Stock: <strong className={prod.stock_status === "IN_STOCK" ? "text-emerald-700" : "text-amber-700"}>{prod.stock_status}</strong></span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <span className="text-base font-black text-neutral-900">
                  ₹{Number(prod.price).toFixed(2)}
                </span>
                <Link
                  href={`/merchant/products/${prod.id}`}
                  className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-700 min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Edit Product"
                >
                  <Edit2 className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
