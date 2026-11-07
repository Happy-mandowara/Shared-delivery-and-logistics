"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Compass, 
  Layers, 
  Store, 
  MapPin, 
  Clock, 
  Users, 
  Check, 
  CheckSquare, 
  Square, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { api } from "@/lib/api-client";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function AdminBatchFormationEnginePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedLocality, setSelectedLocality] = useState("Wyra Road");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [maxOrders, setMaxOrders] = useState(8);
  const [capacityUnits, setCapacityUnits] = useState(10);
  const [assignPartnerModal, setAssignPartnerModal] = useState<any | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Candidate Suborders
  const { data: candidatesData, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ["admin-batch-candidates", selectedLocality],
    queryFn: async () => {
      let url = "/batches/candidates";
      if (selectedLocality !== "ALL") {
        url += `?locality=${encodeURIComponent(selectedLocality)}`;
      }
      const res = await api.get<any>(url);
      return res.data?.candidates || (Array.isArray(res.data) ? res.data : []);
    },
    refetchInterval: 5000,
  });

  // 2. Fetch Available Delivery Partners
  const { data: partnersData } = useQuery({
    queryKey: ["admin-dispatch-partners"],
    queryFn: async () => {
      const res = await api.get<any>("/partners");
      return res.data?.partners || [];
    },
  });

  const candidates = candidatesData || [];
  const partners = partnersData || [];

  // Auto-Optimize Mutation
  const autoOptimizeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<any>("/batches/optimize", {
        locality: selectedLocality,
        maxOrders,
        capacityUnits,
        autoCreate: true,
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      if (data?.totalCreated > 0) {
        setActionSuccess(`Batch Optimization Engine successfully created ${data.totalCreated} optimal batch runs!`);
        queryClient.invalidateQueries({ queryKey: ["admin-batch-candidates"] });
        queryClient.invalidateQueries({ queryKey: ["admin-batches-list"] });
      } else {
        setActionError(data?.message || "No multi-stop candidates available to cluster.");
      }
    },
    onError: (err: any) => {
      setActionError(err.message || "Optimization engine failed.");
    },
  });

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === candidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(candidates.map((c: any) => c.suborderId || c.id));
    }
  };

  // Create Batch Mutation
  const formBatchMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<any>("/batches", {
        suborderIds: selectedIds,
        locality: selectedLocality,
        maxOrders,
        capacityUnits,
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      const batchId = data?.batch_id || data?.id || data?.batch?.id || data?.data?.batch?.id;
      if (batchId) {
        setActionSuccess(`Shared batch #${batchId.slice(0, 8)} successfully formed!`);
        setSelectedIds([]);
        setAssignPartnerModal({ ...data, id: batchId });
        queryClient.invalidateQueries({ queryKey: ["admin-batch-candidates"] });
      } else {
        setActionError(data?.error?.message || "Failed to form batch.");
      }
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to form batch.");
    },
  });

  // Assign Partner Mutation
  const assignPartnerMutation = useMutation({
    mutationFn: async () => {
      if (!assignPartnerModal || !selectedPartnerId) return;
      const res = await api.post<any>(`/batches/${assignPartnerModal.id}/assign`, {
        partnerId: selectedPartnerId,
      });
      return res;
    },
    onSuccess: (res: any) => {
      if (res?.success) {
        setActionSuccess("Delivery partner assigned! Batch is now en route.");
        const targetId = assignPartnerModal?.id;
        setAssignPartnerModal(null);
        setSelectedPartnerId("");
        queryClient.invalidateQueries({ queryKey: ["admin-batches-list"] });
        if (targetId) {
          setTimeout(() => router.push(`/admin/batches/${targetId}`), 1000);
        }
      } else {
        setActionError(res?.error?.message || "Failed to assign partner.");
      }
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to assign partner.");
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Batch Formation & Dispatch Engine
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Algorithmic grouping: match candidate merchant suborders along common corridors into one coordinated delivery run.
        </p>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Corridor & Capacity Configuration Toolbar */}
      <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 block">Khammam Locality Corridor</label>
            <select
              value={selectedLocality}
              onChange={(e) => setSelectedLocality(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
            >
              <option value="Wyra Road">Wyra Road Corridor</option>
              <option value="Mamata Hospital Road">Mamata Hospital Road</option>
              <option value="Gandhi Chowk">Gandhi Chowk</option>
              <option value="Bypass Road">Bypass Road</option>
              <option value="ALL">All Khammam Delivery Sectors</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 block">Max Orders Per Batch</label>
            <input
              type="number"
              min="2"
              max="15"
              value={maxOrders}
              onChange={(e) => setMaxOrders(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 block">Two-Wheeler Capacity Units</label>
            <input
              type="number"
              min="2"
              max="20"
              value={capacityUnits}
              onChange={(e) => setCapacityUnits(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-xs font-bold text-neutral-700 hover:text-neutral-950 flex items-center gap-1.5 p-1"
            >
              {selectedIds.length === candidates.length && candidates.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-[#0F766E]" />
              ) : (
                <Square className="w-4 h-4 text-neutral-400" />
              )}
              <span>Select All Candidates ({candidates.length})</span>
            </button>
            <span className="text-3xs text-neutral-400">|</span>
            <span className="text-xs text-neutral-600 font-semibold">
              {selectedIds.length} suborders selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => autoOptimizeMutation.mutate()}
              disabled={candidates.length < 2 || autoOptimizeMutation.isPending}
              className="px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 disabled:bg-neutral-100 text-[#0F766E] disabled:text-neutral-400 border border-teal-200 text-xs font-bold transition-colors min-h-[44px] flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {autoOptimizeMutation.isPending ? "Optimizing..." : "Auto-Optimize Batches (Smart Engine)"}
              </span>
            </button>

            <button
              onClick={() => formBatchMutation.mutate()}
              disabled={selectedIds.length < 2 || formBatchMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] disabled:bg-neutral-300 text-white text-xs font-bold transition-colors min-h-[44px] flex items-center justify-center gap-2 shadow-xs"
            >
              <Compass className="w-4 h-4" />
              <span>
                {formBatchMutation.isPending
                  ? "Forming Batch..."
                  : `Form Shared Batch (${selectedIds.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Candidate Suborders Checklist */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-neutral-900">
          Unassigned Suborders Eligible for Grouping ({candidates.length})
        </h2>

        {isLoadingCandidates ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
            <TableRowSkeleton />
            <TableRowSkeleton />
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-neutral-900">No pending candidates</h3>
            <p className="text-xs text-neutral-500">
              All placed customer orders in {selectedLocality} have already been grouped into active batches.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden shadow-2xs">
            {candidates.map((c: any) => {
              const subId = c.suborderId || c.id;
              const isSelected = selectedIds.includes(subId);
              return (
                <div
                  key={subId}
                  onClick={() => toggleSelect(subId)}
                  className={`p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                    isSelected ? "bg-teal-50/70" : "hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="p-1 text-neutral-600"
                      aria-label="Toggle select candidate"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-[#0F766E]" />
                      ) : (
                        <Square className="w-5 h-5 text-neutral-300" />
                      )}
                    </button>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-neutral-900">
                          Suborder #{subId ? subId.slice(0, 8) : "—"}
                        </span>
                        <span className="text-3xs uppercase font-extrabold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                          {c.merchantName || c.merchant_name || "Merchant Shop"}
                        </span>
                      </div>
                      <span className="text-3xs text-neutral-500 block">
                        Drop-off: <strong>{c.deliveryLocality || c.delivery_locality || selectedLocality}</strong> · {c.itemCount || c.items?.length || 1} item(s)
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-neutral-900 block">
                      ₹{Number(c.subtotal).toFixed(2)}
                    </span>
                    <span className="text-3xs text-emerald-700 font-bold">
                      {c.status === "READY_FOR_PICKUP" ? "Packed & Ready" : "Ready for Batch"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Partner Assignment Modal */}
      {assignPartnerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-neutral-950">
              <Users className="w-5 h-5 text-[#0F766E]" />
              <h3 className="text-lg font-bold">Assign Fleet Partner</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Batch #{assignPartnerModal.id.slice(0, 8)} created. Select an available two-wheeler delivery partner in Khammam to execute this run.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">Select Active Partner</label>
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[44px]"
              >
                <option value="">Select a partner...</option>
                {partners.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.full_name || (p.id ? p.id.slice(0, 8) : "Partner")} ({p.availability || p.availability_status || "AVAILABLE"})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAssignPartnerModal(null)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 min-h-[44px]"
              >
                Assign Later
              </button>
              <button
                type="button"
                disabled={!selectedPartnerId || assignPartnerMutation.isPending}
                onClick={() => assignPartnerMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold min-h-[44px]"
              >
                {assignPartnerMutation.isPending ? "Assigning..." : "Assign & Dispatch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

