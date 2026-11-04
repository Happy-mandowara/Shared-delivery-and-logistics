"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  Layers, 
  Search, 
  Compass, 
  ArrowRight, 
  Truck, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Users 
} from "lucide-react";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function AdminBatchesListPage() {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const { data: batchesData, isLoading } = useQuery({
    queryKey: ["admin-batches-list"],
    queryFn: async () => {
      const res = await api.get<any>("/batches");
      return res.data?.batches || [];
    },
    refetchInterval: 5000,
  });

  const batches = batchesData || [];

  const filtered = batches.filter((b: any) => {
    const matchesFilter = filter === "ALL" || b.status === filter;
    const matchesSearch = b.id.toLowerCase().includes(search.toLowerCase()) ||
      (b.locality && b.locality.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Batch Operations
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Monitor shared delivery batches across high-density Khammam corridors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/dispatch"
            className="px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5 shadow-xs"
          >
            <Compass className="w-4 h-4" />
            <span>Batch Formation Engine</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search batches by ID or sector..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-neutral-50 rounded-xl text-xs font-medium border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[40px]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { label: "All", value: "ALL" },
            { label: "Open", value: "OPEN" },
            { label: "Assigned", value: "ASSIGNED" },
            { label: "In Transit", value: "IN_TRANSIT" },
            { label: "Completed", value: "COMPLETED" },
            { label: "Cancelled", value: "CANCELLED" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap min-h-[36px] transition-colors ${
                filter === tab.value ? "bg-[#0F766E] text-white" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <Layers className="w-12 h-12 text-neutral-300 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">No batches match this filter</h2>
          <p className="text-xs text-neutral-500">Form new shared batches using the dispatch engine.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs divide-y divide-neutral-100">
          {filtered.map((batch: any) => (
            <div
              key={batch.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-neutral-900">
                    Batch #{batch.id.slice(0, 8)}
                  </span>
                  <StatusBadge status={batch.status} />
                  <span className="text-3xs uppercase font-extrabold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                    {batch.locality || "Wyra Road Corridor"}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span>{batch.suborders_count || 2} merchant suborders</span>
                  <span>{batch.stops_count || 4} stops</span>
                  <span>Created {new Date(batch.created_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                </div>
                {batch.partner_id && (
                  <span className="text-3xs text-teal-800 font-bold block">
                    Assigned Partner: {batch.partner_name || batch.partner_id.slice(0, 8)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <Link
                  href={`/admin/batches/${batch.id}`}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-[#0F766E] text-white text-xs font-bold transition-colors min-h-[40px] flex items-center gap-1.5"
                >
                  <span>Inspect Batch</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

