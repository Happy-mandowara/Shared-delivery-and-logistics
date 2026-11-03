"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers";
import { InteractiveMap, MapMarkerItem } from "@/components/maps/interactive-map";
import { api } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck,
  MapPin,
  Store,
  UserCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  KeyRound,
  Navigation,
  Check,
  Layers
} from "lucide-react";

export default function PartnerPortalPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // POD Verification Modal State
  const [podStop, setPodStop] = useState<any | null>(null);
  const [podCode, setPodCode] = useState<string>("");
  const [podNotes, setPodNotes] = useState<string>("Verified physical customer handover");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [riderStatus, setRiderStatus] = useState<"AVAILABLE" | "BUSY" | "OFFLINE">("AVAILABLE");

  // 1. Fetch Partner Batch Assignments
  const {
    data: assignmentsData,
    isLoading: isLoadingAssignments,
    refetch: refetchAssignments,
  } = useQuery({
    queryKey: ["partner-assignments"],
    queryFn: async () => {
      const res = await api.get<any>("/partners/assignments");
      const list = Array.isArray(res.data) ? res.data : res.data?.assignments || [];
      return list.map((a: any) => ({
        id: a.id,
        batchId: a.batchId || a.batch_id,
        batchCode: a.batchCode || a.batch_code,
        locality: a.locality || "Khammam Central",
        status: a.status,
        orderCount: a.maxOrders || a.max_orders || 2,
      }));
    },
    enabled: Boolean(user),
  });

  const assignments = assignmentsData || [];
  const offeredAssignments = assignments.filter((a: any) => a.status === "OFFERED");
  const activeAssignments = assignments.filter((a: any) => a.status === "ACCEPTED");

  // 2. Fetch Assigned Route Stops
  const {
    data: stopsData,
    isLoading: isLoadingStops,
    refetch: refetchStops,
  } = useQuery({
    queryKey: ["partner-stops"],
    queryFn: async () => {
      const res = await api.get<any>("/partners/stops");
      const list = Array.isArray(res.data) ? res.data : res.data?.stops || [];
      return list.map((s: any) => ({
        id: s.id,
        sequence: s.sequence,
        type: s.type, // PICKUP or DROPOFF
        status: s.status, // PENDING, ARRIVED, COMPLETED, FAILED
        merchantName: s.merchantName || s.merchant_name,
        customerName: s.customerName || s.customer_name,
        address: s.address,
        locality: s.locality || "Khammam Central",
        latitude: Number(s.latitude) || (s.type === "PICKUP" ? 17.2475 : 17.255),
        longitude: Number(s.longitude) || (s.type === "PICKUP" ? 80.1518 : 80.158),
        instructions: s.instructions,
      }));
    },
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (user?.id) {
      refetchAssignments();
      refetchStops();
    }
  }, [user?.id, refetchAssignments, refetchStops]);

  const stops = (stopsData || []).sort((a: any, b: any) => a.sequence - b.sequence);

  // Mutations
  const respondAssignmentMutation = useMutation({
    mutationFn: async ({ assignmentId, accept }: { assignmentId: string; accept: boolean }) => {
      setActionSuccess(null);
      setActionError(null);
      const res = await api.post(`/partners/assignments/${assignmentId}/respond`, {
        accept,
        idempotencyKey: `resp_${assignmentId}_${accept}_${Date.now()}`,
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to respond to assignment");
      return res.data;
    },
    onSuccess: (_, vars) => {
      setActionSuccess(`Batch assignment ${vars.accept ? "ACCEPTED" : "DECLINED"}. Stop sequence loaded.`);
      queryClient.invalidateQueries({ queryKey: ["partner-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["partner-stops"] });
    },
    onError: (err: any) => setActionError(err.message),
  });

  const updateStopMutation = useMutation({
    mutationFn: async ({
      stopId,
      status,
      proofOfDeliveryCode,
    }: {
      stopId: string;
      status: string;
      proofOfDeliveryCode?: string;
    }) => {
      setActionSuccess(null);
      setActionError(null);
      const res = await api.post(`/partners/stops/${stopId}/status`, {
        status,
        proofOfDeliveryCode,
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to update stop status");
      return res.data;
    },
    onSuccess: (_, vars) => {
      setActionSuccess(`Stop status updated to ${vars.status}!`);
      setPodStop(null);
      setPodCode("");
      queryClient.invalidateQueries({ queryKey: ["partner-stops"] });
      queryClient.invalidateQueries({ queryKey: ["partner-assignments"] });
    },
    onError: (err: any) => setActionError(err.message),
  });

  // Prepare Route Markers for Interactive Map
  const stopMarkers: MapMarkerItem[] = stops.map((s: any) => ({
    id: s.id,
    lat: s.latitude,
    lng: s.longitude,
    title: `Stop ${s.sequence}: ${s.type === "PICKUP" ? s.merchantName || "Shop Pickup" : "Customer Drop-off"}`,
    description: s.address,
    badge: s.type === "PICKUP" ? "Pickup" : "Drop-off",
    type: s.type === "PICKUP" ? "pickup" : "dropoff",
    sequenceNumber: s.sequence,
    status: s.status,
  }));

  return (
    <div className="min-h-screen bg-[#F8FAFA] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Header Bar */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
                Delivery Partner Dispatch Portal
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                Rider Console
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Rider: <strong className="text-neutral-800">{user?.full_name || "Suresh Rider"}</strong> ({user?.email}) · Khammam Central
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Availability Toggle */}
            <div className="flex rounded-xl border border-neutral-200 p-0.5 bg-neutral-100 text-xs">
              <button
                onClick={() => setRiderStatus("AVAILABLE")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  riderStatus === "AVAILABLE"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Online
              </button>
              <button
                onClick={() => setRiderStatus("OFFLINE")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  riderStatus === "OFFLINE"
                    ? "bg-neutral-700 text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Offline
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchAssignments();
                refetchStops();
              }}
              className="text-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <span className="font-semibold">{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-xs font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}
        {actionError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
            <span className="font-semibold">{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-xs font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Offered Batch Assignment Alerts */}
        {offeredAssignments.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider px-1">
              New Batch Job Offers ({offeredAssignments.length})
            </h2>
            {offeredAssignments.map((offer: any) => (
              <div
                key={offer.id}
                className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                    SHARED DELIVERY BATCH OFFER
                  </div>
                  <h3 className="font-bold text-base text-neutral-900">
                    Batch #{offer.batchCode || offer.batchId.slice(0, 8)} ({offer.locality})
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Combines {offer.orderCount} compatible suborders across Khammam in one sequence.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      respondAssignmentMutation.mutate({
                        assignmentId: offer.id,
                        accept: false,
                      })
                    }
                    disabled={respondAssignmentMutation.isPending}
                    className="text-neutral-700"
                  >
                    Decline
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      respondAssignmentMutation.mutate({
                        assignmentId: offer.id,
                        accept: true,
                      })
                    }
                    disabled={respondAssignmentMutation.isPending}
                    className="font-bold bg-amber-700 hover:bg-amber-800 text-white"
                  >
                    Accept Shared Batch
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Section: Route Map & Stop Sequence */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Khammam Route Stop Map */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
            <div>
              <h2 className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-teal-700" />
                Active Route Stop Sequence
              </h2>
              <p className="text-xs text-neutral-500">
                Stops are strictly sequenced to avoid premature drop-offs before collection.
              </p>
            </div>

            <InteractiveMap
              height="340px"
              center={[17.2485, 80.153]}
              zoom={14}
              markers={stopMarkers}
              showRoutePolyline
            />

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-[11px] text-neutral-600 space-y-1">
              <div className="font-bold text-neutral-800">Operational Legend:</div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-semibold text-teal-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-700 inline-block" /> Pickup Stop (P)
                </span>
                <span className="flex items-center gap-1 font-semibold text-amber-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-700 inline-block" /> Customer Drop-off (D)
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Ordered Stops Execution List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-neutral-900">
                Stop Checklist ({stops.length} Stops)
              </h2>
              {stops.length > 0 && (
                <span className="text-xs font-semibold text-neutral-500">
                  {stops.filter((s: any) => s.status === "COMPLETED").length} of {stops.length} Completed
                </span>
              )}
            </div>

            {isLoadingStops ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-white rounded-2xl border border-neutral-200 animate-pulse" />
                ))}
              </div>
            ) : stops.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200 text-neutral-500">
                <Truck className="w-12 h-12 mx-auto text-neutral-300 mb-2 stroke-1" />
                <p className="text-sm font-semibold">No active stops assigned</p>
                <p className="text-xs text-neutral-400 mt-1">
                  When the Central Dispatch Ops assigns a batch, the stops will appear here in sequence.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stops.map((stop: any) => {
                  const isPickup = stop.type === "PICKUP";
                  const isPending = stop.status === "PENDING";
                  const isArrived = stop.status === "ARRIVED";
                  const isCompleted = stop.status === "COMPLETED";

                  return (
                    <div
                      key={stop.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all text-left bg-white ${
                        isCompleted
                          ? "border-emerald-200 bg-emerald-50/20"
                          : isArrived
                          ? "border-teal-500 ring-2 ring-teal-500/20 shadow-xs"
                          : "border-neutral-200 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span
                            className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 ${
                              isCompleted
                                ? "bg-emerald-600 text-white"
                                : isPickup
                                ? "bg-teal-700 text-white"
                                : "bg-amber-700 text-white"
                            }`}
                          >
                            {stop.sequence}
                          </span>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-neutral-900">
                                {isPickup ? `Pickup: ${stop.merchantName || "Shop"}` : "Customer Delivery Drop-off"}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                  isPickup ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800"
                                }`}
                              >
                                {stop.type}
                              </span>
                            </div>

                            <p className="text-xs text-neutral-600 font-medium">
                              {stop.address}
                            </p>
                            {stop.locality && (
                              <p className="text-[11px] text-neutral-400">{stop.locality}</p>
                            )}
                          </div>
                        </div>

                        <StatusBadge status={stop.status} />
                      </div>

                      {/* Action Buttons for this Stop */}
                      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                        {isPending && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="font-bold text-xs"
                            onClick={() =>
                              updateStopMutation.mutate({
                                stopId: stop.id,
                                status: "ARRIVED",
                              })
                            }
                            disabled={updateStopMutation.isPending}
                          >
                            Mark Arrived at Location
                          </Button>
                        )}

                        {isArrived && isPickup && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="font-bold text-xs bg-emerald-700 hover:bg-emerald-800"
                            onClick={() =>
                              updateStopMutation.mutate({
                                stopId: stop.id,
                                status: "COMPLETED",
                              })
                            }
                            disabled={updateStopMutation.isPending}
                          >
                            Confirm Package Collection
                          </Button>
                        )}

                        {isArrived && !isPickup && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="font-bold text-xs bg-amber-700 hover:bg-amber-800 flex items-center gap-1.5"
                            onClick={() => setPodStop(stop)}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Verify Customer POD Code
                          </Button>
                        )}

                        {isCompleted && (
                          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                            <Check className="w-4 h-4 text-emerald-700" />
                            Stop Fulfilled
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Proof of Delivery (POD) Modal */}
      {podStop && (
        <Modal
          isOpen={Boolean(podStop)}
          onClose={() => {
            setPodStop(null);
            setPodCode("");
          }}
          title="Verify Proof of Delivery (POD)"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <strong>Mandatory Verification Rule:</strong> physical drop-off requires the customer's 4-digit verification code. Failed attempts are recorded in the audit log.
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-900 mb-1">
                Enter Customer's 4-Digit POD Code *
              </label>
              <Input
                type="text"
                maxLength={4}
                value={podCode}
                onChange={(e) => setPodCode(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 4829"
                className="text-center font-mono text-2xl tracking-widest font-extrabold"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-900 mb-1">
                Delivery Notes
              </label>
              <Input
                value={podNotes}
                onChange={(e) => setPodNotes(e.target.value)}
                placeholder="Handed to customer at doorstep"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button
                variant="ghost"
                onClick={() => {
                  setPodStop(null);
                  setPodCode("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={podCode.length !== 4 || updateStopMutation.isPending}
                onClick={() =>
                  updateStopMutation.mutate({
                    stopId: podStop.id,
                    status: "COMPLETED",
                    proofOfDeliveryCode: podCode,
                  })
                }
                className="font-bold bg-emerald-700 hover:bg-emerald-800"
              >
                {updateStopMutation.isPending ? "Verifying POD..." : "Verify & Complete Drop-off"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
