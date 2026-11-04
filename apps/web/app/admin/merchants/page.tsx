"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Store, 
  Search, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Phone,
  PackageCheck
} from "lucide-react";
import { api } from "@/lib/api-client";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function AdminMerchantsDirectoryPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "APPROVED" | "PENDING">("ALL");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const queryClient = useQueryClient();

  const { data: merchantsData, isLoading, refetch } = useQuery({
    queryKey: ["admin-merchants-dir"],
    queryFn: async () => {
      const res = await api.get<any>("/merchants?includeUnapproved=true&limit=100");
      return res.data?.merchants || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/admin/merchants/${id}/approve`, {});
      if (!res.success) throw new Error(res.error?.message || "Failed to approve merchant");
      return res.data;
    },
    onSuccess: (data) => {
      setActionMessage({ type: "success", text: data?.message || "Merchant approved successfully!" });
      queryClient.invalidateQueries({ queryKey: ["admin-merchants-dir"] });
      setTimeout(() => setActionMessage(null), 4000);
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err.message });
      setTimeout(() => setActionMessage(null), 4000);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post(`/admin/merchants/${id}/reject`, { reason });
      if (!res.success) throw new Error(res.error?.message || "Failed to reject merchant");
      return res.data;
    },
    onSuccess: (data) => {
      setActionMessage({ type: "success", text: data?.message || "Merchant application rejected." });
      queryClient.invalidateQueries({ queryKey: ["admin-merchants-dir"] });
      setTimeout(() => setActionMessage(null), 4000);
    },
    onError: (err: any) => {
      setActionMessage({ type: "error", text: err.message });
      setTimeout(() => setActionMessage(null), 4000);
    },
  });

  const merchants = merchantsData || [];

  const pendingCount = merchants.filter((m: any) => m.isApproved === false || m.isApproved === null).length;
  const approvedCount = merchants.filter((m: any) => m.isApproved === true).length;

  const tabFiltered = merchants.filter((m: any) => {
    if (activeTab === "APPROVED") return m.isApproved === true;
    if (activeTab === "PENDING") return m.isApproved === false || m.isApproved === null;
    return true;
  });

  const filtered = tabFiltered.filter((m: any) =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.locality?.toLowerCase().includes(search.toLowerCase()) ||
    m.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
              Merchants & Outlets
            </h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-neutral-600">
            Khammam commercial merchant network directory, approvals, and onboarding lifecycle.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, category, area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white rounded-xl text-xs font-medium border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
          />
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          {actionMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center gap-2 ${
            activeTab === "ALL"
              ? "bg-neutral-900 text-white shadow-xs"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          <span>All Outlets</span>
          <span className="text-3xs opacity-80 px-1.5 py-0.5 rounded-full bg-black/20 font-black">
            {merchants.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("APPROVED")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center gap-2 ${
            activeTab === "APPROVED"
              ? "bg-[#0F766E] text-white shadow-xs"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          <span>Active & Live</span>
          <span className="text-3xs opacity-80 px-1.5 py-0.5 rounded-full bg-black/20 font-black">
            {approvedCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("PENDING")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center gap-2 ${
            activeTab === "PENDING"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          <span>Pending Review</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-3xs font-black bg-white text-amber-900">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <Store className="w-12 h-12 text-neutral-300 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">No merchants matching filter</h2>
          <p className="text-xs text-neutral-500">
            {activeTab === "PENDING"
              ? "No pending merchant onboarding applications currently awaiting review."
              : "Try adjusting your search query or switching tabs."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs divide-y divide-neutral-100">
          {filtered.map((m: any) => {
            const isApproved = m.isApproved === true;
            return (
              <div
                key={m.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50/50 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-neutral-950">{m.name}</span>
                    <span className="text-3xs font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                      {m.category || "General"}
                    </span>
                    {isApproved ? (
                      <span className="px-2 py-0.5 rounded text-3xs font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Live in Khammam</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-3xs font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Pending Approval</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{m.address || m.locality || "Khammam Sector 01"}</span>
                    </span>
                    {m.contactPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{m.contactPhone}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <PackageCheck className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{m.productCount || 0} Products</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isApproved && (
                    <>
                      <button
                        onClick={() => approveMutation.mutate(m.id)}
                        disabled={approveMutation.isPending}
                        className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Shop</span>
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt("Enter rejection reason for merchant:") || "Verification documentation incomplete.";
                          rejectMutation.mutate({ id: m.id, reason });
                        }}
                        disabled={rejectMutation.isPending}
                        className="px-3.5 py-2.5 rounded-xl border border-neutral-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-neutral-700 text-xs font-bold transition-all min-h-[44px] flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  <Link
                    href={`/admin/merchants/${m.id}`}
                    className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-[#0F766E] text-white text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5"
                  >
                    <span>View Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
