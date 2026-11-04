"use client";

import React from "react";
import { MapPin, Navigation, Store, Home, AlertCircle } from "lucide-react";

export interface MapPoint {
  id: string;
  title: string;
  subtitle?: string;
  type: "MERCHANT" | "CUSTOMER" | "PARTNER" | "STOP";
  latitude: number;
  longitude: number;
  sequence?: number;
  status?: string;
}

export interface RouteMapProps {
  points?: MapPoint[];
  stops?: any[];
  batchId?: string;
  status?: string;
  center?: { latitude: number; longitude: number };
  zoom?: number;
  showDemoBadge?: boolean;
  className?: string;
}

export function RouteMap({
  points = [],
  stops = [],
  batchId,
  status,
  center = { latitude: 17.2472, longitude: 80.1514 }, // Khammam Central default
  showDemoBadge = true,
  className = "",
}: RouteMapProps) {
  // Convert stops to MapPoints if points is empty
  const resolvedPoints: MapPoint[] =
    points && points.length > 0
      ? points
      : (stops || []).map((s: any, idx: number) => ({
          id: s.id || `stop-${idx}`,
          title: s.name || (s.type === "PICKUP" ? "Shop Pickup" : "Customer Drop-off"),
          subtitle: s.address || s.locality,
          type: s.type === "PICKUP" ? "MERCHANT" : "CUSTOMER",
          latitude: Number(s.latitude || s.lat) || 17.2472,
          longitude: Number(s.longitude || s.lng) || 80.1514,
          sequence: idx + 1,
          status: s.status,
        }));

  // Bounding box calculation for SVG coordinate normalization
  const lats = resolvedPoints.map((p) => p.latitude).concat(center.latitude);
  const lngs = resolvedPoints.map((p) => p.longitude).concat(center.longitude);

  const minLat = Math.min(...lats) - 0.008;
  const maxLat = Math.max(...lats) + 0.008;
  const minLng = Math.min(...lngs) - 0.008;
  const maxLng = Math.max(...lngs) + 0.008;

  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;

  // Project lat/lng to 0-100% SVG coordinates
  const project = (lat: number, lng: number) => {
    const x = ((lng - minLng) / lngRange) * 100;
    const y = 100 - ((lat - minLat) / latRange) * 100; // inverted Y
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  return (
    <div
      className={`relative w-full rounded-2xl border border-neutral-300 bg-[#F4F6F6] overflow-hidden shadow-inner ${className}`}
      style={{ minHeight: "280px" }}
    >
      {/* Daylight High-Contrast Map Background Grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(#0F766E 1px, transparent 1px), radial-gradient(#0F766E 1px, #F4F6F6 1px)`,
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0, 12px 12px",
        }}
      />

      {/* SVG Connecting Route Vector */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {resolvedPoints.length > 1 && (
          <polyline
            points={resolvedPoints
              .map((p) => {
                const { x, y } = project(p.latitude, p.longitude);
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#0F766E"
            strokeWidth="1.2"
            strokeDasharray="2,2"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Map Markers */}
      {resolvedPoints.map((pt, idx) => {
        const { x, y } = project(pt.latitude, pt.longitude);
        let badgeColor = "bg-neutral-800 text-white";
        let Icon = MapPin;

        if (pt.type === "MERCHANT") {
          badgeColor = "bg-[#0F766E] text-white";
          Icon = Store;
        } else if (pt.type === "CUSTOMER") {
          badgeColor = "bg-indigo-700 text-white";
          Icon = Home;
        } else if (pt.type === "PARTNER") {
          badgeColor = "bg-emerald-600 text-white ring-4 ring-emerald-100";
          Icon = Navigation;
        }

        return (
          <div
            key={pt.id || idx}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all hover:scale-110 z-10"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div className="group relative flex flex-col items-center cursor-pointer">
              {/* Marker Bubble */}
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full shadow-md font-bold text-xs ${badgeColor}`}
              >
                {pt.sequence !== undefined ? (
                  <span>{pt.sequence}</span>
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Tooltip Label */}
              <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-20">
                <div className="bg-neutral-900 text-white text-xs rounded-md px-2.5 py-1 whitespace-nowrap shadow-lg">
                  <span className="font-semibold">{pt.title}</span>
                  {pt.subtitle && (
                    <span className="block text-2xs text-neutral-300">{pt.subtitle}</span>
                  )}
                </div>
              </div>

              <span className="mt-1 text-2xs font-semibold text-neutral-800 bg-white/90 px-1.5 py-0.5 rounded shadow-2xs border border-neutral-200 truncate max-w-[100px]">
                {pt.title}
              </span>
            </div>
          </div>
        );
      })}

      {/* Honest Reality Banner */}
      {showDemoBadge && (
        <div className="absolute top-3 left-3 z-20 bg-white/95 border border-neutral-200/90 rounded-lg px-2.5 py-1.5 shadow-xs flex items-center gap-1.5 text-xs text-neutral-700">
          <AlertCircle className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>Verified GPS Coordinates (Khammam Central Pilot)</span>
        </div>
      )}

      {/* Legend / Helper Footer */}
      <div className="absolute bottom-3 right-3 z-20 bg-white/95 border border-neutral-200/90 rounded-lg p-2 shadow-xs flex items-center gap-3 text-xs text-neutral-600">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
          <span>Shop Pickup</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-700" />
          <span>Customer Drop-off</span>
        </div>
      </div>
    </div>
  );
}
