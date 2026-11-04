"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Truck, MapPin, Users, ShieldCheck, Clock, Radio, Activity } from "lucide-react";
import { api } from "@/lib/api-client";
import { RouteMap } from "@/components/ui/route-map";

export default function AdminLiveOperationsPage() {
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);

  // 1. Fetch Fleet Partners
  const { data: partnersData, isLoading: isLoadingPartners } = useQuery({
    queryKey: ["admin-live-fleet"],
    queryFn: async () => {
      const res = await api.get<any>("/partners");
      return res.data?.partners || [];
    },
    refetchInterval: 5000,
  });

  // 2. Fetch Active Batches
  const { data: batchesData } = useQuery({
    queryKey: ["admin-live-batches"],
    queryFn: async () => {
      const res = await api.get<any>("/batches");
      return res.data?.batches || [];
    },
    refetchInterval: 5000,
  });

  const partners = partnersData || [];
  const batches = batchesData || [];

  const sampleNetworkStops = [
    {
      id: "shop-1",
      name: "Bawarchi Biryani Central",
      address: "Wyra Road, Beside Clock Tower, Khammam",
      lat: 17.2472,
      lng: 80.1514,
      type: "PICKUP" as const,
      status: "COMPLETED" as const,
      locality: "Wyra Road"
    },
    {
      id: "shop-2",
      name: "Sri Balaji Supermarket",
      address: "Near Bus Station Road, Khammam",
      lat: 17.251,
      lng: 80.158,
      type: "PICKUP" as const,
      status: "COMPLETED" as const,
      locality: "Bus Stand Road"
    },
    {
      id: "drop-1",
      name: "Customer Drop-off (Mamata Hospital)",
      address: "Mamata General Hospital Quarters, Khammam",
      lat: 17.2589,
      lng: 80.1422,
      type: "DROPOFF" as const,
      status: "PENDING" as const,
      locality: "Mamata Hospital"
    },
    {
      id: "drop-2",
      name: "Customer Drop-off (Bank Colony)",
      address: "Plot 42, Bank Colony, Khammam",
      lat: 17.263,
      lng: 80.165,
      type: "DROPOFF" as const,
      status: "PENDING" as const,
      locality: "Bank Colony"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-3xs font-extrabold uppercase tracking-widest text-[#0F766E]">
              Khammam Urban Sector 01
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Live Fleet Monitoring
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Real-time delivery partner readiness and stop execution supervision.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold bg-white px-3 py-2 rounded-xl border border-neutral-200">
          <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>{partners.length} Registered Partners Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Panel */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-900">Sector Geofence Map</span>
            <span className="text-3xs text-neutral-500">Live GPS simulation disabled per Project 03 rules</span>
          </div>

          <RouteMap stops={sampleNetworkStops} batchId="LIVE-SECTOR-01" status="ACTIVE" className="h-96 rounded-2xl" />

          <div className="p-3 bg-neutral-50 rounded-xl text-3xs text-neutral-600 flex items-center justify-between">
            <span>High-density stops: 2 Merchant Outlets · 2 Doorstep Deliveries</span>
            <span className="font-bold text-teal-800">100% On-Time SLA</span>
          </div>
        </div>

        {/* Fleet Roster */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-neutral-950">Active Fleet Roster</h2>

          <div className="space-y-3">
            {partners.map((p: any) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900">{p.full_name || "Partner Rider"}</span>
                  <span className={`text-3xs font-extrabold uppercase px-2 py-0.5 rounded ${
                    p.availability_status === "AVAILABLE" ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-700"
                  }`}>
                    {p.availability_status || "AVAILABLE"}
                  </span>
                </div>
                <div className="text-3xs text-neutral-500 space-y-0.5">
                  <span className="block">Vehicle: Hero Splendor (TS04)</span>
                  <span className="block">Sector: Wyra Road & Mamata Hospital</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

