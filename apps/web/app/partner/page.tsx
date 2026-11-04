"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Bike, 
  MapPin, 
  Clock, 
  IndianRupee, 
  Navigation, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Check, 
  X, 
  Store,
  Layers,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/components/providers";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricCardSkeleton } from "@/components/ui/skeleton";

export default function PartnerDashboardOverviewPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Partner Batch Assignments
  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ["partner-dashboard-assignments"],
    queryFn: async () => {
      const res = await api.get<any>("/partners/assignments");
      return res.data?.assignments || (Array.isArray(res.data) ? res.data : []);
    },
    refetchInterval: 5000,
  });

  const assignments = assignmentsData || [];

  // Active assignment
  const activeAssignment = assignments.find((a: any) =>
    ["ASSIGNED", "ACCEPTED", "IN_TRANSIT"].includes(a.status)
  );

  // Pending offer (needing ACCEPT or REJECT)
  const pendingOffer = assignments.find((a: any) => a.status === "OFFERED" || (a.status === "ASSIGNED" && !a.partner_accepted_at));

  // Mutations
  const acceptOfferMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await api.post<any>(`/partners/assignments/${assignmentId}/respond`, {
        action: "ACCEPT",
      });
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess("Batch Accepted! Switching to Active Delivery Run.");
      queryClient.invalidateQueries({ queryKey: ["partner-dashboard-assignments"] });
      setTimeout(() => setActionSuccess(null), 3000);
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to accept batch.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  const rejectOfferMutation = useMutation({
    mutationFn: async ({ assignmentId, reason }: { assignmentId: string; reason: string }) => {
      const res = await api.post<any>(`/partners/assignments/${assignmentId}/respond`, {
        action: "REJECT",
        reason: reason || "Rider unavailable for this sector route",
      });
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess("Batch offer declined. Returning to available pool.");
      queryClient.invalidateQueries({ queryKey: ["partner-dashboard-assignments"] });
      setTimeout(() => setActionSuccess(null), 3000);
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to decline batch.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  const completedBatches = assignments.filter((a: any) => a.status === "COMPLETED");

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-3xs font-extrabold uppercase tracking-widest text-[#0F766E]">
              Khammam Fleet Active · Wyra Road Hub
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Namaste, {user?.full_name?.split(" ")[0] || "Delivery Partner"}!
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            You are online and eligible for shared batches along high-density corridors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/partner/active-delivery"
            className="px-5 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center gap-2 min-h-[48px] shadow-xs"
          >
            <Navigation className="w-4 h-4" />
            <span>Active Run Cockpit</span>
          </Link>
          <Link
            href="/partner/earnings"
            className="px-4 py-3 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-bold transition-colors min-h-[48px] flex items-center gap-2"
          >
            <IndianRupee className="w-4 h-4" />
            <span>Earnings</span>
          </Link>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* NEW BATCH OFFER ALERT (If available) */}
      {pendingOffer && (
        <div className="p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-500 text-neutral-950 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                New Shared Batch Job Offer Available!
              </span>
            </div>
            <span className="text-3xs font-extrabold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              URGENT
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-neutral-950">
              Batch #{pendingOffer.batch_id?.slice(0, 8) || pendingOffer.id.slice(0, 8)}
            </h3>
            <p className="text-xs text-neutral-700">
              Includes {pendingOffer.stops_count || 4} coordinated stops along Wyra Road and Mamata Hospital.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => acceptOfferMutation.mutate(pendingOffer.id)}
              disabled={acceptOfferMutation.isPending}
              className="flex-1 py-3 px-4 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-black min-h-[48px] flex items-center justify-center gap-2 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Accept Job Offer</span>
            </button>
            <button
              onClick={() => rejectOfferMutation.mutate({ assignmentId: pendingOffer.id, reason: "Route outside active zone" })}
              disabled={rejectOfferMutation.isPending}
              className="py-3 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold min-h-[48px] flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>Decline</span>
            </button>
          </div>
        </div>
      )}

      {/* Daily Driver Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
          <span className="text-3xs uppercase font-extrabold text-neutral-400 tracking-wider block mb-1">
            Active Runs
          </span>
          <span className="text-3xl font-black text-[#0F766E] block">
            {activeAssignment ? "1" : "0"}
          </span>
          <span className="text-3xs text-neutral-400 mt-1 block">In execution</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
          <span className="text-3xs uppercase font-extrabold text-neutral-400 tracking-wider block mb-1">
            Runs Completed
          </span>
          <span className="text-3xl font-black text-neutral-950 block">
            {completedBatches.length}
          </span>
          <span className="text-3xs text-neutral-400 mt-1 block">Today in Khammam</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
          <span className="text-3xs uppercase font-extrabold text-neutral-400 tracking-wider block mb-1">
            Stops Handled
          </span>
          <span className="text-3xl font-black text-neutral-950 block">
            {completedBatches.length * 4}
          </span>
          <span className="text-3xs text-neutral-400 mt-1 block">100% POD verified</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
          <span className="text-3xs uppercase font-extrabold text-neutral-400 tracking-wider block mb-1">
            Today&apos;s Earnings
          </span>
          <span className="text-3xl font-black text-neutral-950 block">
            ₹{completedBatches.length * 120}
          </span>
          <span className="text-3xs text-emerald-700 font-bold mt-1 block">Demo Compensation</span>
        </div>
      </div>

      {/* ACTIVE BATCH RUN SUMMARY */}
      {activeAssignment ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-teal-950 text-white shadow-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-3xs font-extrabold uppercase tracking-widest text-teal-400">
                Current Assigned Mission
              </span>
              <h2 className="text-2xl font-black text-white">
                Batch #{activeAssignment.batch_id?.slice(0, 8) || activeAssignment.id.slice(0, 8)}
              </h2>
            </div>
            <StatusBadge status={activeAssignment.status} />
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed max-w-xl">
            You have an active delivery batch. Collect orders from merchant outlets along Wyra Road, then enter customer 4-digit PINs at each drop-off.
          </p>

          <div className="pt-2">
            <Link
              href="/partner/active-delivery"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#115e59] text-white text-xs font-black min-h-[48px] shadow-sm"
            >
              <span>Enter Driver Cockpit & Execute Stops</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <Bike className="w-12 h-12 text-neutral-300 mx-auto" />
          <h2 className="text-base font-bold text-neutral-950">No active assignment</h2>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Keep your status set to <strong>Online</strong>. When the batching engine forms a shared run in your sector, an offer will ring on this screen.
          </p>
        </div>
      )}
    </div>
  );
}
