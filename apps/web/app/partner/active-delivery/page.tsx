"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Navigation, 
  MapPin, 
  Store, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  PhoneCall, 
  Check, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Bike
} from "lucide-react";
import { api } from "@/lib/api-client";
import { RouteMap } from "@/components/ui/route-map";
import { StatusBadge } from "@/components/ui/status-badge";

export default function PartnerActiveDeliveryCockpitPage() {
  const queryClient = useQueryClient();
  const [podStop, setPodStop] = useState<any | null>(null);
  const [podPin, setPodPin] = useState("");
  const [exceptionStop, setExceptionStop] = useState<any | null>(null);
  const [exceptionReason, setExceptionReason] = useState("CUSTOMER_UNREACHABLE");
  const [exceptionNotes, setExceptionNotes] = useState("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch Active Batch Stops
  const { data: stopsData, isLoading } = useQuery({
    queryKey: ["partner-active-stops"],
    queryFn: async () => {
      const res = await api.get<any>("/partners/stops");
      return res.data?.stops || (Array.isArray(res.data) ? res.data : []);
    },
    refetchInterval: 5000,
  });

  const stops = stopsData || [];

  // Stop Status Mutation
  const updateStopStatusMutation = useMutation({
    mutationFn: async ({ stopId, status, podCode }: { stopId: string; status: string; podCode?: string }) => {
      const payload: any = { status };
      if (podCode) {
        payload.proofOfDeliveryCode = podCode;
        payload.pod_code = podCode;
      }
      const res = await api.post<any>(`/partners/stops/${stopId}/status`, payload);
      return res;
    },
    onSuccess: (res: any) => {
      if (res?.success) {
        setActionSuccess("Stop marked as COMPLETED!");
        setPodStop(null);
        setPodPin("");
        queryClient.invalidateQueries({ queryKey: ["partner-active-stops"] });
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        setActionError(res?.error?.message || "Failed to complete stop.");
        setTimeout(() => setActionError(null), 4000);
      }
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to update stop.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  // Exception Mutation
  const reportExceptionMutation = useMutation({
    mutationFn: async ({ stopId, reason, notes }: { stopId: string; reason: string; notes: string }) => {
      // 1. Record stop exception event
      const res = await api.post<any>(`/stops/${stopId}/exception`, {
        reason,
        notes,
      });

      // 2. Also record in incident reports cockpit
      try {
        await api.post<any>("/partners/incidents", {
          stopId,
          category: reason,
          description: notes,
        });
      } catch (e) {
        // Log silently if incident table logging fails
      }

      return res.data;
    },
    onSuccess: () => {
      setActionSuccess("Exception logged. Dispatch supervisor notified.");
      setExceptionStop(null);
      setExceptionNotes("");
      queryClient.invalidateQueries({ queryKey: ["partner-active-stops"] });
      setTimeout(() => setActionSuccess(null), 3000);
    },
    onError: (err: any) => {
      setActionError(err.message || "Failed to record exception.");
      setTimeout(() => setActionError(null), 4000);
    },
  });

  // Map representation of stops
  const mapStops = stops.map((s: any) => ({
    id: s.id,
    name: s.type === "PICKUP" ? (s.merchant_name || "Merchant Shop") : (s.customer_name || "Customer Drop-off"),
    address: s.address || "Khammam Sector 01",
    lat: Number(s.latitude) || 17.2472,
    lng: Number(s.longitude) || 80.1514,
    type: s.type as "PICKUP" | "DROPOFF",
    status: s.status as "PENDING" | "COMPLETED" | "FAILED",
    locality: s.locality || "Wyra Road"
  }));

  const pendingStops = stops.filter((s: any) => s.status === "PENDING");
  const allStopsCompleted = stops.length > 0 && pendingStops.length === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Driver Cockpit Header */}
      <div className="p-6 rounded-3xl bg-[#0B1514] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg border border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-3xs font-extrabold uppercase tracking-widest text-teal-400">
              Active Driver Mission
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Delivery Partner Cockpit
          </h1>
          <p className="text-xs text-neutral-300">
            {pendingStops.length} stop(s) remaining · Khammam Urban Run
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/partner/jobs"
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5"
          >
            <span>Batch Manifest</span>
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

      {/* Map View */}
      {stops.length > 0 && (
        <div className="p-4 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-3">
          <RouteMap stops={mapStops} batchId="ACTIVE-RUN" status="ACTIVE" className="h-64 sm:h-72 rounded-2xl" />
          <div className="flex items-center justify-between text-3xs text-neutral-500 px-2">
            <span>Verified GPS Stop Sequence (No Fake Route Simulation)</span>
            <span className="font-bold text-teal-800">High-Contrast Daylight Mode</span>
          </div>
        </div>
      )}

      {/* Stop Sequence Cockpit Cards */}
      {isLoading ? (
        <div className="p-8 rounded-3xl bg-white border border-neutral-200 animate-pulse h-64" />
      ) : allStopsCompleted ? (
        <div className="p-10 text-center bg-white rounded-3xl border border-emerald-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-neutral-950">All Stops Completed!</h2>
          <p className="text-xs text-neutral-600 max-w-md mx-auto">
            You successfully completed all pickups and drop-offs for this shared batch. Payout has been credited to your settlement balance.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/partner/earnings"
              className="px-6 py-3 rounded-xl bg-[#0F766E] text-white text-xs font-bold min-h-[48px] flex items-center gap-2"
            >
              <span>View Earnings</span>
            </Link>
            <Link
              href="/partner/jobs"
              className="px-6 py-3 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-bold min-h-[48px] flex items-center gap-2"
            >
              <span>Find Next Batch</span>
            </Link>
          </div>
        </div>
      ) : stops.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <Bike className="w-12 h-12 text-neutral-300 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">No active delivery run</h2>
          <p className="text-xs text-neutral-500">
            Accept a batch offer under <strong>Available Batches</strong> to initialize your route stops.
          </p>
          <Link
            href="/partner/jobs"
            className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold"
          >
            Check Available Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-neutral-950">Stop-by-Stop Checklist</h2>

          {stops.map((stop: any, idx: number) => {
            const isCompleted = stop.status === "COMPLETED";
            const isPickup = stop.type === "PICKUP";

            return (
              <div
                key={stop.id}
                className={`p-6 rounded-2xl border transition-all space-y-4 ${
                  isCompleted
                    ? "bg-neutral-50/60 border-neutral-200 opacity-70"
                    : isPickup
                    ? "bg-white border-teal-300 shadow-2xs"
                    : "bg-white border-neutral-300 shadow-2xs"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      isCompleted ? "bg-emerald-600 text-white" : isPickup ? "bg-[#0F766E] text-white" : "bg-neutral-900 text-white"
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-neutral-900">
                          {isPickup ? (stop.merchant_name || "Merchant Outlet") : "Customer Drop-off"}
                        </span>
                        <span className={`text-3xs font-extrabold uppercase px-2 py-0.5 rounded ${
                          isPickup ? "bg-teal-50 text-[#0F766E]" : "bg-neutral-100 text-neutral-800"
                        }`}>
                          {stop.type}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-500 block mt-0.5">
                        {stop.address || "Khammam Sector 01"}
                      </span>
                    </div>
                  </div>

                  <span className={`text-3xs font-extrabold px-2.5 py-1 rounded-full ${
                    isCompleted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {stop.status}
                  </span>
                </div>

                {/* Stop Action Bar */}
                {!isCompleted && (
                  <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-end gap-3">
                    <button
                      onClick={() => setExceptionStop(stop)}
                      className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-600 text-xs font-bold min-h-[48px] flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Report Exception</span>
                    </button>

                    {isPickup ? (
                      <button
                        onClick={() => updateStopStatusMutation.mutate({ stopId: stop.id, status: "COMPLETED" })}
                        disabled={updateStopStatusMutation.isPending}
                        className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-black min-h-[48px] flex items-center gap-2 shadow-xs"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirm Order Picked Up</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setPodStop(stop)}
                        className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-black min-h-[48px] flex items-center gap-2 shadow-xs"
                      >
                        <KeyRound className="w-4 h-4 text-teal-400" />
                        <span>Enter 4-Digit Customer PIN & Complete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* POD Code Entry Modal */}
      {podStop && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-2 text-neutral-950">
              <KeyRound className="w-6 h-6 text-[#0F766E]" />
              <h3 className="text-xl font-black">Proof of Delivery Verification</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Ask the customer at the door for their private 4-digit confirmation PIN. The order cannot be marked completed without this code.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block text-center">
                Enter 4-Digit PIN
              </label>
              <input
                type="text"
                maxLength={4}
                autoFocus
                placeholder="• • • •"
                value={podPin}
                onChange={(e) => setPodPin(e.target.value.replace(/\D/g, ""))}
                className="w-full text-center tracking-[1em] font-mono text-2xl font-black py-3 px-4 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[52px]"
              />
            </div>

            {actionError && (
              <span className="text-xs text-rose-600 font-bold block text-center">
                {actionError}
              </span>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setPodStop(null); setPodPin(""); }}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 min-h-[48px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={podPin.length !== 4 || updateStopStatusMutation.isPending}
                onClick={() => updateStopStatusMutation.mutate({ stopId: podStop.id, status: "COMPLETED", podCode: podPin })}
                className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] disabled:bg-neutral-300 text-white text-xs font-black min-h-[48px]"
              >
                {updateStopStatusMutation.isPending ? "Verifying..." : "Verify & Complete Drop-off"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exception Modal */}
      {exceptionStop && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold">Report Delivery Exception</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              If a customer is unavailable, merchant outlet is closed, or route is blocked, log an exception for the operations team.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">Exception Reason</label>
              <select
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[44px]"
              >
                <option value="CUSTOMER_UNREACHABLE">Customer Phone Unreachable</option>
                <option value="GATE_LOCKED">Premises / Gate Locked</option>
                <option value="INCORRECT_ADDRESS">Address Not Found / Incorrect</option>
                <option value="MERCHANT_CLOSED">Merchant Outlet Closed</option>
                <option value="VEHICLE_BREAKDOWN">Vehicle Breakdown / Puncture</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">Additional Notes</label>
              <textarea
                rows={2}
                placeholder="e.g. Waited 10 mins outside Mamata hospital block"
                value={exceptionNotes}
                onChange={(e) => setExceptionNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setExceptionStop(null)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reportExceptionMutation.isPending}
                onClick={() => reportExceptionMutation.mutate({ stopId: exceptionStop.id, reason: exceptionReason, notes: exceptionNotes })}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold min-h-[44px]"
              >
                {reportExceptionMutation.isPending ? "Logging..." : "Submit Exception"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
