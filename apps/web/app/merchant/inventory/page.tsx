"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Layers, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  Sparkles
} from "lucide-react";
import { api } from "@/lib/api-client";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function MerchantInventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["merchant-inventory-products"],
    queryFn: async () => {
      const res = await api.get<any>("/products");
      return res.data?.products || [];
    },
  });

  const products = productsData || [];

  const updateStockMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch<any>(`/products/${id}`, {
        stock_status: status,
      });
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess("Stock status refreshed and broadcasted to marketplace!");
      queryClient.invalidateQueries({ queryKey: ["merchant-inventory-products"] });
      setTimeout(() => setActionSuccess(null), 3000);
    },
  });

  const filtered = products.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Freshness policy helper: check if last updated > 3 days ago
  const isStale = (timestamp?: string) => {
    if (!timestamp) return true;
    const diffDays = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 3;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Stock Inventory & Freshness
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Real-time stock controls. Items not confirmed within 3 days automatically flag as &quot;Call to confirm&quot;.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl text-xs font-medium border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[40px]"
          />
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Policy Notice Card */}
      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-[#0F766E] flex items-center gap-3">
        <Sparkles className="w-5 h-5 shrink-0" />
        <div className="text-3xs sm:text-xs">
          <strong>NationX Freshness Protocol:</strong> Keep your stock confirmed daily to ensure automatic inclusion in customer search and instant shared batching dispatch.
        </div>
      </div>

      {/* Inventory Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200">
          <Layers className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-900">No items found</h3>
          <p className="text-xs text-neutral-500">Add products to your catalog to manage stock availability here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs divide-y divide-neutral-100">
          {filtered.map((item: any) => {
            const stale = isStale(item.updated_at);
            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-neutral-900">{item.name}</span>
                    <span className="text-3xs uppercase px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-bold">
                      {item.category}
                    </span>
                  </div>
                  <span className="text-3xs text-neutral-400 block">
                    Last confirmed: {item.updated_at ? new Date(item.updated_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }) : "Never"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Stock Quick Selector */}
                  <select
                    value={item.stock_status}
                    onChange={(e) => updateStockMutation.mutate({ id: item.id, status: e.target.value })}
                    className="px-3 py-1.5 rounded-xl border border-neutral-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[40px]"
                  >
                    <option value="IN_STOCK">In Stock</option>
                    <option value="CALL_TO_CONFIRM">Call to confirm</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>

                  <button
                    onClick={() => updateStockMutation.mutate({ id: item.id, status: "IN_STOCK" })}
                    disabled={updateStockMutation.isPending}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0F766E] border border-teal-200 text-xs font-bold min-h-[40px] flex items-center gap-1"
                    title="Confirm stock fresh today"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Confirm Fresh</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
