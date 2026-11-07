"use client";

import React from "react";
import { MapPin, ShieldCheck, Compass, CheckCircle2, Clock } from "lucide-react";

export default function AdminServiceZonesPage() {
  const zones = [
    {
      id: "sec-01",
      name: "Wyra Road Corridor & Clock Tower",
      status: "ACTIVE",
      radius: "3.5 km",
      merchantsCount: "4 Active Outlets",
      cutoffMinutes: 15,
      coordinates: "17.2472°N, 80.1514°E",
    },
    {
      id: "sec-02",
      name: "Mamata General Hospital Belt",
      status: "ACTIVE",
      radius: "4.2 km",
      merchantsCount: "2 Active Outlets",
      cutoffMinutes: 20,
      coordinates: "17.2589°N, 80.1422°E",
    },
    {
      id: "sec-03",
      name: "Gandhi Chowk & Old Bus Station",
      status: "ACTIVE",
      radius: "3.0 km",
      merchantsCount: "3 Active Outlets",
      cutoffMinutes: 15,
      coordinates: "17.2510°N, 80.1580°E",
    },
    {
      id: "sec-04",
      name: "Khammam Bypass Road Corridor",
      status: "EXPANSION_PLANNED",
      radius: "6.0 km",
      merchantsCount: "0 (Planned)",
      cutoffMinutes: 30,
      coordinates: "17.2630°N, 80.1650°E",
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Service Polygons & Geofences
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Operational dispatch polygons for two-wheeler transport in Khammam Municipal Corporation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-50 text-[#0F766E]">
                  {zone.id.toUpperCase()}
                </span>
                <span className={`text-3xs font-extrabold uppercase px-2 py-0.5 rounded ${
                  zone.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-600"
                }`}>
                  {zone.status === "ACTIVE" ? "Active Delivery Sector" : "Expansion"}
                </span>
              </div>

              <h2 className="text-base font-bold text-neutral-900">{zone.name}</h2>
              <span className="text-3xs font-mono text-neutral-400 block mt-0.5">{zone.coordinates}</span>
            </div>

            <div className="pt-3 border-t border-neutral-100 grid grid-cols-3 gap-2 text-3xs text-neutral-600">
              <div>
                <span className="text-neutral-400 block">Radius</span>
                <strong className="text-neutral-900">{zone.radius}</strong>
              </div>
              <div>
                <span className="text-neutral-400 block">Merchants</span>
                <strong className="text-neutral-900">{zone.merchantsCount}</strong>
              </div>
              <div>
                <span className="text-neutral-400 block">Cutoff</span>
                <strong className="text-neutral-900">{zone.cutoffMinutes}m Max</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

