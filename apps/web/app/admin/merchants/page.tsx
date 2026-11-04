"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Store, Search, MapPin, ArrowRight, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function AdminMerchantsDirectoryPage() {
  const [search, setSearch] = useState("");

  const { data: merchantsData, isLoading } = useQuery({
    queryKey: ["admin-merchants-dir"],
    queryFn: async () => {
      const res = await api.get<any>("/merchants");
      return res.data?.merchants || [];
    },
  });

  const merchants = merchantsData || [];

  const filtered = merchants.filter((m: any) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.locality && m.locality.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Merchants & Outlets
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Registered merchant partners participating in Khammam shared logistics.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search merchants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl text-xs font-medium border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[40px]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <Store className="w-12 h-12 text-neutral-300 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">No merchants found</h2>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs divide-y divide-neutral-100">
          {filtered.map((m: any) => (
            <div
              key={m.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900">{m.name}</span>
                  <span className="px-2 py-0.5 rounded text-3xs font-extrabold uppercase bg-emerald-50 text-emerald-800">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{m.address || m.locality || "Khammam Sector 01"}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/merchants/${m.id}`}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-[#0F766E] text-white text-xs font-bold transition-colors min-h-[40px] flex items-center gap-1.5"
                >
                  <span>Outlet Profile</span>
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

