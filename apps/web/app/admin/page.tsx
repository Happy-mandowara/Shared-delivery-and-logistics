"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/ui/navbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/components/providers";
import { InteractiveMap, MapMarkerItem } from "@/components/maps/interactive-map";
import { api } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Layers,
  Truck,
  Users,
  RefreshCw,
  CheckSquare,
  Square,
  ArrowRight,
  Clock,
  AlertCircle,
  FileText,
  MapPin,
  CheckCircle2,
  Filter,
  Navigation
} from "lucide-react";

export default function AdminPortalPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"candidates" | "batches" | "events" | "map">("candidates");
  const [selectedLocality, setSelectedLocality] = useState<string>("Khammam Central");
  const [selectedSuborderIds, setSelectedSuborderIds] = useState<string[]>([]);
  const [maxOrders, setMaxOrders] = useState<number>(8);
  const [capacityUnits, setCapacityUnits] = useState<number>(10);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);
  const [batchErrorMessage, setBatchErrorMessage] = useState<string | null>(null);

  // Assignment Modal State
  const [assigningBatch, setAssigningBatch] = useState<any | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  // 1. Fetch Candidate Suborders for Batching
  const {
    data: candidatesData,
    isLoading: isLoadingCandidates,
    refetch: refetchCandidates,
  } = useQuery({
    queryKey: ["batch-candidates", selectedLocality],
    queryFn: async () => {
      const res = await api.get<any>(
        `/batches/candidates?locality=${encodeURIComponent(selectedLocality)}`
      );
      const list = Array.isArray(res.data) ? res.data : res.data?.candidates || [];
      return list.map((c: any) => ({
        suborderId: c.suborderId || c.suborder_id,
        suborderNumber: c.suborderNumber || c.suborder_number,
        merchantName: c.merchantName || c.merchant_name,
        merchantLocality: c.merchantLocality || c.merchant_locality,
        deliveryLocality: c.deliveryLocality || c.delivery_locality,
        deliveryAddress: c.deliveryAddress || c.delivery_address,
        itemCount: c.itemCount || c.item_count || 1,
        subtotal: c.subtotal,
        status: c.status,
      }));
    },
    enabled: Boolean(user),
  });

  const candidates = candidatesData || [];

  // 2. Fetch Formed Batches
  const {
    data: batchesData,
    isLoading: isLoadingBatches,
    refetch: refetchBatches,
  } = useQuery({
    queryKey: ["admin-batches"],
    queryFn: async () => {
      const res = await api.get<any>("/batches");
      return res.data?.batches || [];
    },
    enabled: Boolean(user),
  });

  const batches = batchesData || [];

  // 3. Fetch Delivery Partners for Assignment
  const {
    data: partnersData,
    isLoading: isLoadingPartners,
    refetch: refetchPartners,
  } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const res = await api.get<any>("/partners");
      return res.data?.partners || [];
    },
    enabled: Boolean(user),
  });

  const partners = partnersData || [];

  // 4. Fetch Delivery Audit Events
  const {
    data: eventsData,
    isLoading: isLoadingEvents,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const res = await api.get<any>("/events");
      return res.data?.events || [];
    },
    enabled: Boolean(user),
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (user?.id) {
      refetchCandidates();
      refetchBatches();
      refetchPartners();
      refetchEvents();
    }
  }, [user?.id, refetchCandidates, refetchBatches, refetchPartners, refetchEvents]);

  const events = eventsData || [];

  // Create Batch Mutation
  const createBatchMutation = useMutation({
    mutationFn: async () => {
      setBatchSuccessMessage(null);
      setBatchErrorMessage(null);
      const res = await api.post("/batches", {
        locality: selectedLocality,
        maxOrders,
        capacityUnits,
        suborderIds: selectedSuborderIds,
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to create batch");
      return res.data;
    },
    onSuccess: (data: any) => {
      setBatchSuccessMessage(
        `Batch created successfully: #${data.batchCode || data.batch_code || "NEW"} with ${selectedSuborderIds.length} suborders!`
      );
      setSelectedSuborderIds([]);
      queryClient.invalidateQueries({ queryKey: ["batch-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: (err: any) => setBatchErrorMessage(err.message),
  });

  // Assign Partner Mutation
  const assignPartnerMutation = useMutation({
    mutationFn: async () => {
      setAssignmentError(null);
      if (!assigningBatch || !selectedPartnerId) {
        throw new Error("Please select an active delivery partner");
      }
      const res = await api.post(`/batches/${assigningBatch.id}/assign`, {
        partnerId: selectedPartnerId,
      });
      if (!res.success) throw new Error(res.error?.message || "Assignment failed");
      return res.data;
    },
    onSuccess: () => {
      setBatchSuccessMessage("Batch successfully dispatched and offered to delivery partner!");
      setAssigningBatch(null);
      setSelectedPartnerId("");
      queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: (err: any) => setAssignmentError(err.message),
  });

  const toggleSelectSuborder = (id: string) => {
    setSelectedSuborderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllCandidates = () => {
    if (selectedSuborderIds.length === candidates.length) {
      setSelectedSuborderIds([]);
    } else {
      setSelectedSuborderIds(candidates.map((c: any) => c.suborderId));
    }
  };

  // Khammam Map Markers (Overview)
  const overviewMarkers: MapMarkerItem[] = [
    {
      id: "shop-1",
      lat: 17.2472,
      lng: 80.1514,
      title: "Bawarchi Biryani",
      description: "Wyra Road, Khammam Central",
      badge: "Shop Cluster",
      type: "merchant",
    },
    {
      id: "shop-2",
      lat: 17.249,
      lng: 80.153,
      title: "Balaji Kirana Store",
      description: "Mayuri Centre, Khammam Central",
      badge: "Shop Cluster",
      type: "merchant",
    },
    {
      id: "shop-3",
      lat: 17.251,
      lng: 80.1545,
      title: "Sri Krishna Sweets",
      description: "Station Road, Khammam Central",
      badge: "Shop Cluster",
      type: "merchant",
    },
    {
      id: "partner-1",
      lat: 17.248,
      lng: 80.152,
      title: "Suresh Rider (2-Wheeler)",
      description: "Current Locality: Khammam Central (Available)",
      badge: "Rider",
      type: "partner",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFA] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Header */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
                Central Operations Dispatch Console
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                Khammam Hub
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Locality batching engine, partner assignment, and real-time delivery audit events.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchCandidates();
                refetchBatches();
                refetchPartners();
                refetchEvents();
              }}
              className="text-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh All
            </Button>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {batchSuccessMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <span className="font-semibold">{batchSuccessMessage}</span>
            <button
              onClick={() => setBatchSuccessMessage(null)}
              className="text-xs font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}
        {batchErrorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
            <span className="font-semibold">{batchErrorMessage}</span>
            <button
              onClick={() => setBatchErrorMessage(null)}
              className="text-xs font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-neutral-200 pb-2">
          <button
            onClick={() => setActiveTab("candidates")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === "candidates"
                ? "bg-[#0F766E] text-white shadow-2xs"
                : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
            }`}
          >
            Batch Formation ({candidates.length} Candidates)
          </button>
          <button
            onClick={() => setActiveTab("batches")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === "batches"
                ? "bg-[#0F766E] text-white shadow-2xs"
                : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
            }`}
          >
            Formed Batches ({batches.length})
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === "events"
                ? "bg-[#0F766E] text-white shadow-2xs"
                : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
            }`}
          >
            Delivery Audit Log ({events.length})
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              activeTab === "map"
                ? "bg-[#0F766E] text-white shadow-2xs"
                : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200"
            }`}
          >
            Khammam Dispatch Map
          </button>
        </div>

        {/* TAB 1: BATCH CANDIDATES */}
        {activeTab === "candidates" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-700">Cluster Locality:</span>
                <select
                  value={selectedLocality}
                  onChange={(e) => setSelectedLocality(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-neutral-300 bg-white"
                >
                  <option value="Khammam Central">Khammam Central</option>
                  <option value="Mamillagudem">Mamillagudem</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllCandidates}
                  className="text-xs"
                >
                  {selectedSuborderIds.length === candidates.length && candidates.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={selectedSuborderIds.length === 0 || createBatchMutation.isPending}
                  onClick={() => createBatchMutation.mutate()}
                  className="font-bold bg-teal-700 hover:bg-teal-800"
                >
                  <Layers className="w-4 h-4 mr-1.5" />
                  {createBatchMutation.isPending
                    ? "Forming Batch..."
                    : `Create Batch (${selectedSuborderIds.length})`}
                </Button>
              </div>
            </div>

            {isLoadingCandidates ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 bg-white rounded-2xl border border-neutral-200 animate-pulse" />
                ))}
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200 text-neutral-500">
                <Layers className="w-12 h-12 mx-auto text-neutral-300 mb-2 stroke-1" />
                <p className="text-sm font-semibold">No unassigned suborders in this cluster.</p>
                <p className="text-xs text-neutral-400 mt-1">
                  When customers place orders, eligible suborders will appear here for batching.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {candidates.map((cand: any) => {
                  const isSelected = selectedSuborderIds.includes(cand.suborderId);
                  return (
                    <div
                      key={cand.suborderId}
                      onClick={() => toggleSelectSuborder(cand.suborderId)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-left bg-white ${
                        isSelected
                          ? "border-[#0F766E] ring-2 ring-[#0F766E]/20 bg-teal-50/20 shadow-xs"
                          : "border-neutral-200 hover:border-neutral-300 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-neutral-900">
                          #{cand.suborderNumber}
                        </span>
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-teal-700" />
                        ) : (
                          <Square className="w-5 h-5 text-neutral-300" />
                        )}
                      </div>

                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-bold text-neutral-800">
                          {cand.merchantName}
                        </div>
                        <div className="text-xs text-neutral-500 truncate">
                          To: {cand.deliveryAddress}
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                        <span className="text-neutral-500">{cand.itemCount} Items</span>
                        <span className="font-bold text-neutral-900">
                          ₹{Number(cand.subtotal).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FORMED BATCHES */}
        {activeTab === "batches" && (
          <div className="space-y-4">
            {isLoadingBatches ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-44 bg-white rounded-2xl border border-neutral-200 animate-pulse" />
                ))}
              </div>
            ) : batches.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200 text-neutral-500">
                <Truck className="w-12 h-12 mx-auto text-neutral-300 mb-2 stroke-1" />
                <p className="text-sm font-semibold">No delivery batches created yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batches.map((batch: any) => (
                  <div
                    key={batch.id}
                    className="p-5 rounded-2xl border border-neutral-200 bg-white shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-neutral-900">
                          #{batch.batch_code || batch.batchCode}
                        </span>
                        <StatusBadge status={batch.status} />
                      </div>

                      <p className="text-xs text-neutral-600">
                        Locality: <strong>{batch.locality}</strong>
                      </p>
                      <p className="text-xs text-neutral-500">
                        Capacity: {batch.capacity_units || batch.capacityUnits || 10} units
                      </p>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                      {batch.status === "CREATED" || batch.status === "OFFERED" ? (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full font-bold bg-indigo-700 hover:bg-indigo-800"
                          onClick={() => setAssigningBatch(batch)}
                        >
                          <Truck className="w-4 h-4 mr-1.5" />
                          Assign Delivery Partner
                        </Button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Partner Assigned
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DELIVERY AUDIT LOG */}
        {activeTab === "events" && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Immutable Delivery Events Audit Log
                </h2>
                <p className="text-xs text-neutral-500">
                  All state transitions, handovers, and physical verification events are recorded in public.delivery_events.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                {events.length} Events Logged
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Message</th>
                    <th className="py-2.5 px-3">Order / Suborder</th>
                    <th className="py-2.5 px-3">Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {events.map((evt: any) => (
                    <tr key={evt.id} className="hover:bg-neutral-50/50">
                      <td className="py-2.5 px-3 text-neutral-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(evt.created_at || evt.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-neutral-900">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 font-mono text-[10px]">
                          {evt.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-700 max-w-xs truncate">
                        {evt.message}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500 font-mono text-[10px]">
                        {evt.order_id ? evt.order_id.slice(0, 8) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500 font-mono text-[10px]">
                        {evt.actor_id ? evt.actor_id.slice(0, 8) : "System"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: KHAMMAM DISPATCH MAP */}
        {activeTab === "map" && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
                <MapPin className="w-5 h-5 text-teal-700" />
                Khammam Pilot Operational Map
              </h2>
              <p className="text-xs text-neutral-500">
                Real shop nodes and active partner coordinates in Khammam, Telangana.
              </p>
            </div>

            <InteractiveMap
              height="450px"
              center={[17.2485, 80.153]}
              zoom={14}
              markers={overviewMarkers}
            />
          </div>
        )}
      </main>

      {/* Assign Partner Modal */}
      {assigningBatch && (
        <Modal
          isOpen={Boolean(assigningBatch)}
          onClose={() => setAssigningBatch(null)}
          title={`Assign Partner to Batch #${assigningBatch.batch_code || assigningBatch.batchCode}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            {assignmentError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs">
                {assignmentError}
              </div>
            )}

            <p className="text-xs text-neutral-600">
              Select an available delivery partner in <strong>{assigningBatch.locality}</strong> to offer this coordinated batch.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-800">
                Available Delivery Partners:
              </label>

              {partners.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-neutral-300 text-center text-xs text-neutral-500">
                  No partners available.
                </div>
              ) : (
                partners.map((p: any) => {
                  const isSelected = selectedPartnerId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPartnerId(p.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                        isSelected
                          ? "border-teal-600 bg-teal-50"
                          : "border-neutral-200 bg-white hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-neutral-900">
                        <span>{p.user_name || p.userName || "Partner Rider"}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          {p.availability || "AVAILABLE"}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-1">
                        Vehicle: {p.vehicle_type || p.vehicleType || "Motorcycle"} · Locality: {p.current_locality || p.currentLocality}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button variant="ghost" onClick={() => setAssigningBatch(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!selectedPartnerId || assignPartnerMutation.isPending}
                onClick={() => assignPartnerMutation.mutate()}
                className="font-bold bg-teal-700 hover:bg-teal-800"
              >
                {assignPartnerMutation.isPending ? "Assigning..." : "Confirm & Dispatch Offer"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
