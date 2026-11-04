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
  Copy,
  Upload,
  FileSpreadsheet,
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Layers,
  X,
  ExternalLink
} from "lucide-react";
import { api } from "@/lib/api-client";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function MerchantProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await api.post<any>("/merchants/products/duplicate", { productId });
      return res.data;
    },
    onSuccess: (data) => {
      setActionMsg({ type: "success", text: `Product duplicated successfully: ${data.product?.name}` });
      queryClient.invalidateQueries({ queryKey: ["merchant-products-catalog"] });
      setTimeout(() => setActionMsg(null), 4000);
    },
    onError: (err: any) => {
      setActionMsg({ type: "error", text: err.message || "Failed to duplicate product" });
      setTimeout(() => setActionMsg(null), 4000);
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await api.delete<any>(`/products/${productId}`);
      return res.data;
    },
    onSuccess: () => {
      setActionMsg({ type: "success", text: "Product archived from catalog" });
      queryClient.invalidateQueries({ queryKey: ["merchant-products-catalog"] });
      setTimeout(() => setActionMsg(null), 4000);
    },
    onError: (err: any) => {
      setActionMsg({ type: "error", text: err.message || "Failed to archive product" });
      setTimeout(() => setActionMsg(null), 4000);
    },
  });

  // CSV Import handler
  const handleBulkImport = async () => {
    setImportLoading(true);
    setImportResult(null);
    try {
      // Parse CSV or JSON
      const lines = importText.trim().split("\n");
      if (lines.length === 0) throw new Error("Please provide data to import");

      let itemsToImport: any[] = [];

      // Check if JSON
      if (importText.trim().startsWith("[")) {
        itemsToImport = JSON.parse(importText);
      } else {
        // Parse CSV
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(",").map(cell => cell.trim());
          if (row.length < 2 || !row[0]) continue;
          
          const obj: any = {};
          headers.forEach((h, idx) => {
            const val = row[idx];
            if (h === "name") obj.name = val;
            else if (h === "price") obj.price = parseFloat(val) || 0;
            else if (h === "category") obj.category = val || "General";
            else if (h === "description") obj.description = val || "";
            else if (h === "unit") obj.unit = val || "piece";
            else if (h === "handling") obj.handling_requirements = val || "STANDARD";
            else if (h === "stock_status") obj.stock_status = val || "IN_STOCK";
          });
          if (obj.name && obj.price) itemsToImport.push(obj);
        }
      }

      if (itemsToImport.length === 0) {
        throw new Error("No valid product rows parsed. Use: name,price,category,description,unit");
      }

      const res = await api.post<any>("/merchants/products/import", { products: itemsToImport });
      if (res.data?.success) {
        setImportResult(`Successfully imported ${res.data.count} products!`);
        queryClient.invalidateQueries({ queryKey: ["merchant-products-catalog"] });
        setTimeout(() => {
          setIsImportModalOpen(false);
          setImportText("");
          setImportResult(null);
        }, 1800);
      } else {
        throw new Error(res.data?.error?.message || "Import failed");
      }
    } catch (err: any) {
      setImportResult(`Error: ${err.message}`);
    } finally {
      setImportLoading(false);
    }
  };

  const sampleCsv = `name,price,category,description,unit\nHyderabadi Chicken Biryani,220,Restaurants,Aromatic spiced basmati rice with chicken,plate\nPaneer Butter Masala,180,Restaurants,Cottage cheese in rich buttery tomato gravy,plate\nFresh Milk 1L,60,Dairy,Locally sourced buffalo milk,litre\nAtta Whole Wheat 5kg,210,Groceries,Premium stone ground whole wheat flour,kg`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Products Catalogue
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Maintain your store&apos;s product offerings, multi-image galleries, variants, and bulk imports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#0F766E]" />
            <span>Bulk CSV Import</span>
          </button>

          <Link
            href="/merchant/products/new"
            className="px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* Action Notification */}
      {actionMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
          actionMsg.type === "success" 
            ? "bg-emerald-50 border border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border border-rose-200 text-rose-800"
        }`}>
          {actionMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

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
          <p className="text-xs text-neutral-500">Create your first catalog product or import via CSV to start accepting orders.</p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-800 text-xs font-bold"
            >
              Import CSV
            </button>
            <Link
              href="/merchant/products/new"
              className="px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold"
            >
              Add Product Now
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs divide-y divide-neutral-100">
          {filtered.map((prod: any) => {
            const primaryImg = (prod.image_urls && prod.image_urls[0]) || prod.image_url;
            return (
              <div
                key={prod.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/60 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {primaryImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={primaryImg} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-neutral-400" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-neutral-900">{prod.name}</span>
                      <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                        {prod.category}
                      </span>
                      {prod.unit && (
                        <span className="text-3xs font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                          per {prod.unit}
                        </span>
                      )}
                      {prod.variants && Array.isArray(prod.variants) && prod.variants.length > 0 && (
                        <span className="text-3xs font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {prod.variants.length} variants
                        </span>
                      )}
                    </div>
                    {prod.description && (
                      <p className="text-xs text-neutral-500 line-clamp-1 max-w-xl">{prod.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-3xs text-neutral-400">
                      <span>Handling: <strong>{prod.handling_requirements || "STANDARD"}</strong></span>
                      <span>Stock: <strong className={prod.stock_status === "IN_STOCK" ? "text-emerald-700" : "text-amber-700"}>{prod.stock_status}</strong></span>
                      {prod.image_urls && prod.image_urls.length > 1 && (
                        <span>Images: <strong>{prod.image_urls.length}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <div className="text-right mr-2">
                    <span className="text-base font-black text-neutral-900 block">
                      ₹{Number(prod.price).toFixed(2)}
                    </span>
                    {prod.unit && <span className="text-3xs text-neutral-400">/ {prod.unit}</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => duplicateMutation.mutate(prod.id)}
                      disabled={duplicateMutation.isPending}
                      className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                      title="Duplicate product (Copy)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <Link
                      href={`/merchant/products/${prod.id}`}
                      className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-700 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                      title="Edit Product"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => {
                        if (confirm(`Archive "${prod.name}" from catalog?`)) {
                          archiveMutation.mutate(prod.id);
                        }
                      }}
                      disabled={archiveMutation.isPending}
                      className="p-2 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                      title="Archive Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#0F766E]" />
                <h3 className="text-base font-bold text-neutral-900">Bulk Product Import</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              Paste CSV or JSON rows with product data. Columns supported: <code>name</code>, <code>price</code>, <code>category</code>, <code>description</code>, <code>unit</code>.
            </p>

            <div className="flex items-center justify-between text-3xs text-neutral-500">
              <span>Quick Paste Format</span>
              <button
                onClick={() => setImportText(sampleCsv)}
                className="text-[#0F766E] hover:underline font-bold"
              >
                Load Sample Template
              </button>
            </div>

            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste CSV rows here..."
              className="w-full p-3 font-mono text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-neutral-50"
            />

            {importResult && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                importResult.startsWith("Successfully")
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}>
                {importResult}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                disabled={importLoading || !importText.trim()}
                className="px-5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {importLoading ? "Importing..." : "Validate & Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

