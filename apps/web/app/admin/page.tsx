"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  Activity, 
  Layers, 
  ClipboardList, 
  Truck, 
  Compass, 
  AlertTriangle, 
  Store, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  MapPin
} from "lucide-react";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { RouteMap } from "@/components/ui/route-map";

export default function AdminCommandCenterPage() {
  // 1. Fetch Orders
  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["admin-overview-orders"],
    queryFn: async () => {
      const res = await api.get<any>("/orders");
      return res.data?.orders || (Array.isArray(res.data) ? res.data : []);
    },
    refetchInterval: 6000,
  });

  // 2. Fetch Batches
  const { data: batchesData, isLoading: isLoadingBatches } = useQuery({
    queryKey: ["admin-overview-batches"],
    queryFn: async () => {
      const res = await api.get<any>("/batches");
      return res.data?.batches || [];
    },
    refetchInterval: 6000,
  });

  // 3. Fetch Batch Candidates
  const { data: candidatesData } = useQuery({
    queryKey: ["admin-overview-candidates"],
    queryFn: async () => {
      const res = await api.get<any>("/batches/candidates");
      return res.data?.candidates || (Array.isArray(res.data) ? res.data : []);
    },
  });

  const orders = ordersData || [];
  const batches = batchesData || [];
  const candidates = candidatesData || [];

  const unassignedOrders = orders.filter((o: any) => ["PENDING", "ACCEPTED"].includes(o.status));
  const activeBatches = batches.filter((b: any) => ["ASSIGNED", "IN_TRANSIT"].includes(b.status));
  const completedBatches = batches.filter((b: any) => b.status === "COMPLETED");

  const liveMapStops =
    activeBatches.length > 0 && Array.isArray(activeBatches[0].stops) && activeBatches[0].stops.length > 0
      ? activeBatches[0].stops.map((s: any, idx: number) => ({
          id: s.id,
          name: s.locationName || (s.stopType === "PICKUP" ? "Shop Handover" : "Customer Drop-off"),
          address: s.address || "Khammam Sector",
          lat: Number(s.latitude) || 17.2472,
          lng: Number(s.longitude) || 80.1514,
          type: (s.stopType === "PICKUP" ? "PICKUP" : "DROPOFF") as "PICKUP" | "DROPOFF",
          status: s.status,
          sequence: s.sequenceNumber || idx + 1,
        }))
      : [
          {
            id: "shop-1",
            name: "Bawarchi Biryani Central",
            address: "Wyra Road, Beside Clock Tower, Khammam",
            lat: 17.2472,
            lng: 80.1514,
            type: "PICKUP" as const,
            status: "COMPLETED" as const,
            locality: "Wyra Road",
          },
          {
            id: "shop-2",
            name: "Sri Balaji Supermarket",
            address: "Near Bus Station Road, Khammam",
            lat: 17.251,
            lng: 80.158,
            type: "PICKUP" as const,
            status: "COMPLETED" as const,
            locality: "Bus Stand Road",
          },
          {
            id: "drop-1",
            name: "Customer Drop-off (Mamata Hospital)",
            address: "Mamata General Hospital Quarters, Khammam",
            lat: 17.2589,
            lng: 80.1422,
            type: "DROPOFF" as const,
            status: "PENDING" as const,
            locality: "Mamata Hospital",
          },
        ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-3xs font-extrabold uppercase tracking-widest text-[#0F766E]">
              Khammam Command Operations · Engine Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Logistics Command Center
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Real-time multi-vendor batch coordination, fleet allocation, and audit supervision.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/dispatch"
            className="px-5 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors min-h-[48px] flex items-center gap-2 shadow-xs"
          >
            <Compass className="w-4 h-4" />
            <span>Form Shared Batch ({candidates.length})</span>
          </Link>
          <Link
            href="/admin/live-operations"
            className="px-4 py-3 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-bold transition-colors min-h-[48px] flex items-center gap-2"
          >
            <Truck className="w-4 h-4" />
            <span>Fleet Map</span>
          </Link>
        </div>
      </div>

      {/* Network Operational Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-3xs uppercase font-extrabold tracking-wider">Unassigned Orders</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-3xl font-black text-neutral-950 block">{unassignedOrders.length}</span>
          <span className="text-3xs text-neutral-400 mt-1 block">Awaiting batching</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-3xs uppercase font-extrabold tracking-wider">Active Batches</span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <span className="text-3xl font-black text-teal-800 block">{activeBatches.length}</span>
          <span className="text-3xs text-neutral-400 mt-1 block">In transit across Khammam</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-3xs uppercase font-extrabold tracking-wider">Completed Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-3xl font-black text-emerald-700 block">{completedBatches.length}</span>
          <span className="text-3xs text-neutral-400 mt-1 block">100% POD verified</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-3xs uppercase font-extrabold tracking-wider">Batch Candidates</span>
            <Compass className="w-4 h-4 text-[#0F766E]" />
          </div>
          <span className="text-3xl font-black text-[#0F766E] block">{candidates.length}</span>
          <span className="text-3xs text-neutral-400 mt-1 block">Ready for grouping</span>
        </div>
      </div>

      {/* Live Operational Corridors & Batch Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Active Batches */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-950">Active Batch Runs</h2>
            <Link href="/admin/batches" className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1">
              <span>View All Batches</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {batches.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-neutral-200">
              <Layers className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
              <span className="text-sm font-bold text-neutral-900 block">No batches formed yet</span>
              <p className="text-xs text-neutral-500 mt-1">Use the Batch Formation Engine to group compatible orders.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.slice(0, 4).map((b: any) => (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-neutral-900">
                        Batch #{b.id.slice(0, 8)}
                      </span>
                      <StatusBadge status={b.status} />
                    </div>
                    <span className="text-3xs text-neutral-500 block">
                      Sector: {b.locality || "Wyra Road Corridor"} · {b.suborders_count || 2} merchant suborders
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <Link
                      href={`/admin/batches/${b.id}`}
                      className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-[#0F766E] text-white text-xs font-bold transition-colors min-h-[40px] flex items-center gap-1.5"
                    >
                      <span>Manage Batch</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Fleet Live Map Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0F766E]" />
                <h2 className="text-sm font-bold text-neutral-950">Khammam Sector 01 Geometry</h2>
              </div>
              <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded bg-teal-50 text-[#0F766E]">
                LIVE NETWORK
              </span>
            </div>

            <RouteMap stops={liveMapStops} batchId="KHM-CMD-CTR" status="ACTIVE" className="h-64 rounded-2xl" />

            <div className="pt-2 text-3xs text-neutral-500 flex items-center justify-between">
              <span>Wyra Road & Mamata Hospital Corridors</span>
              <Link href="/admin/live-operations" className="text-teal-700 font-bold hover:underline">
                Open Full Screen Fleet Map →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
