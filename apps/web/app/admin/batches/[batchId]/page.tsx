"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Layers, 
  Truck, 
  MapPin, 
  Users, 
  Clock, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck 
} from "lucide-react";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { RouteMap } from "@/components/ui/route-map";
import { Timeline } from "@/components/ui/timeline";

export default function AdminBatchDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const batchId = params?.batchId as string;

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [reassignReason, setReassignReason] = useState("Operational load balancing");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Batch Details
  const { data: batchData, isLoading } = useQuery({
    queryKey: ["admin-batch-detail", batchId],
    queryFn: async () => {
      const res = await api.get<any>(`/batches/${batchId}`);
      return res.data?.batch || res.data || null;
    },
    enabled: Boolean(batchId),
    refetchInterval: 5000,
  });

  // 2. Fetch Available Partners for Assignment & Reassignment
  const { data: partnersData } = useQuery({
    queryKey: ["admin-available-partners"],
    queryFn: async () => {
      const res = await api.get<any>("/partners");
      return res.data?.partners || [];
    },
  });

  const batch = batchData;
  const partners = partnersData || [];

  // Assign Mutation (for OPEN batch)
  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<any>(`/batches/${batchId}/assign`, {
        partnerId: selectedPartnerId,
      });
      return res;
    },
    onSuccess: (res: any) => {
      if (res?.success) {
        setActionSuccess("Batch successfully assigned to delivery partner!");
        setShowAssignModal(false);
        queryClient.invalidateQueries({ queryKey: ["admin-batch-detail", batchId] });
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        setActionError(res?.error?.message || "Failed to assign batch.");
        setTimeout(() => setActionError(null), 4000);
      }
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to assign batch.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  // Reassignment Mutation
  const reassignMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<any>(`/batches/${batchId}/reassign`, {
        newPartnerId: selectedPartnerId,
        reason: reassignReason,
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        setActionSuccess("Batch successfully reassigned to new delivery partner!");
        setShowReassignModal(false);
        queryClient.invalidateQueries({ queryKey: ["admin-batch-detail", batchId] });
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        setActionError(data?.error?.message || "Failed to reassign batch.");
        setTimeout(() => setActionError(null), 4000);
      }
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to reassign batch.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-white border border-neutral-200 animate-pulse h-96" />
    );
  }

  if (!batch) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center bg-white rounded-3xl border border-neutral-200">
        <Layers className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-neutral-900">Batch Not Found</h2>
        <Link href="/admin/batches" className="text-xs font-bold text-[#0F766E] hover:underline">
          Back to Batch Operations
        </Link>
      </div>
    );
  }

  const mapStops = batch.stops?.map((s: any) => ({
    id: s.id,
    name: s.type === "PICKUP" ? (s.merchant_name || "Merchant Shop") : (s.customer_name || "Customer Drop-off"),
    address: s.address || "Khammam Sector 01",
    lat: Number(s.latitude) || 17.2472,
    lng: Number(s.longitude) || 80.1514,
    type: s.type as "PICKUP" | "DROPOFF",
    status: s.status as "PENDING" | "COMPLETED" | "FAILED",
    locality: s.locality || "Wyra Road"
  })) || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/batches"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Batch Operations</span>
      </Link>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-neutral-950">
                Batch #{batch.id.slice(0, 8)}
              </h1>
              <StatusBadge status={batch.status} />
            </div>
            <span className="text-xs text-neutral-500 block">
              Locality: {batch.locality || "Wyra Road Corridor"} · Created {batch.createdAt || batch.created_at ? new Date(batch.createdAt || batch.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "Recently"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {batch.status === "OPEN" && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-xs font-bold text-white transition-colors min-h-[40px] flex items-center gap-1.5"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Assign Partner</span>
              </button>
            )}
            {["ASSIGNED", "IN_TRANSIT"].includes(batch.status) && (
              <button
                onClick={() => setShowReassignModal(true)}
                className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-xs font-bold text-neutral-800 transition-colors min-h-[40px] flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reassign Partner</span>
              </button>
            )}
          </div>
        </div>

        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Assigned Partner Pill */}
        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-900 block">
                {batch.assignment?.partnerName || batch.partner_name || (batch.status === "OPEN" ? "Awaiting Partner Assignment" : "Delivery Partner Assigned")}
              </span>
              <span className="text-3xs text-neutral-500">
                Partner ID: {batch.assignment?.partnerId || batch.partner_id || "Unassigned"}
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-teal-800">
            {batch.stops?.length || 0} stops in run
          </span>
        </div>

        {/* Map View */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-neutral-900 block">Batch Geometry Map</span>
          <RouteMap stops={mapStops} batchId={batch.id} status={batch.status} className="h-72 rounded-2xl" />
        </div>

        {/* Stops Sequence */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-neutral-900 block">Stops Lifecycle Sequence</span>
          <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
            {batch.stops?.map((stop: any, idx: number) => (
              <div key={stop.id} className="p-4 bg-white flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                    stop.status === "COMPLETED" ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-800"
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <span className="font-bold text-neutral-900 block">
                      {stop.type === "PICKUP" ? (stop.merchant_name || "Merchant Shop") : (stop.customer_name || "Customer Drop-off")}
                    </span>
                    <span className="text-3xs text-neutral-500">{stop.address || "Khammam Sector 01"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-3xs font-extrabold uppercase px-2 py-0.5 rounded ${
                    stop.type === "PICKUP" ? "bg-teal-50 text-[#0F766E]" : "bg-neutral-100 text-neutral-800"
                  }`}>
                    {stop.type}
                  </span>
                  <StatusBadge status={stop.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-neutral-950">
              <Truck className="w-5 h-5 text-[#0F766E]" />
              <h3 className="text-lg font-bold">Assign Delivery Partner</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Select an available delivery partner in Khammam to execute this shared delivery run.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">Select Active Partner</label>
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[44px]"
              >
                <option value="">Select available partner...</option>
                {partners.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.id.slice(0, 8)} ({p.status || p.availability || "AVAILABLE"})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedPartnerId || assignMutation.isPending}
                onClick={() => assignMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold min-h-[44px]"
              >
                {assignMutation.isPending ? "Assigning..." : "Confirm & Dispatch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassignment Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-neutral-950">
              <RotateCcw className="w-5 h-5 text-[#0F766E]" />
              <h3 className="text-lg font-bold">Reassign Delivery Partner</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Select another verified delivery partner operating in Khammam Sector 01 to take over this batch.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">Choose Partner</label>
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[44px]"
              >
                <option value="">Select available partner...</option>
                {partners.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.id.slice(0, 8)} ({p.availability_status || "AVAILABLE"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">Reassignment Reason</label>
              <input
                type="text"
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedPartnerId || reassignMutation.isPending}
                onClick={() => reassignMutation.mutate()}
                className="px-5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold min-h-[44px]"
              >
                {reassignMutation.isPending ? "Reassigning..." : "Confirm Reassignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

