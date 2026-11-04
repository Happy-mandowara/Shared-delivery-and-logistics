"use client";

import React from "react";
import { InteractiveMap, type MapMarkerItem } from "@/components/maps/interactive-map";

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

const KHAMMAM_CENTER: [number, number] = [17.2472, 80.1514];

export function RouteMap({
  points = [],
  stops = [],
  batchId,
  status,
  center = { latitude: 17.2472, longitude: 80.1514 },
  showDemoBadge = false,
  className = "h-72 rounded-2xl",
}: RouteMapProps) {
  // Convert points / stops into MapMarkerItem array
  const rawItems = points.length > 0 ? points : stops;

  const markers: MapMarkerItem[] = rawItems.map((item: any, idx: number) => {
    const lat = Number(item.latitude || item.lat) || 17.2472;
    const lng = Number(item.longitude || item.lng) || 80.1514;
    const isPickup = item.type === "PICKUP" || item.type === "MERCHANT";

    return {
      id: item.id || `marker-${idx}`,
      lat,
      lng,
      title: item.title || item.name || (isPickup ? "Shop Handover" : "Customer Drop-off"),
      description: item.subtitle || item.address || item.locality || "Khammam Sector",
      type: isPickup ? "pickup" : "dropoff",
      sequenceNumber: item.sequence || idx + 1,
      status: item.status || "PENDING",
    };
  });

  const mapCenter: [number, number] = [center.latitude, center.longitude];

  return (
    <div className={`relative overflow-hidden border border-neutral-200 ${className}`}>
      <InteractiveMap
        center={mapCenter}
        zoom={14}
        markers={markers}
        showRoutePolyline={markers.length > 1}
        height="100%"
        className="w-full h-full min-h-[260px]"
      />
      {batchId && (
        <div className="absolute top-3 left-3 z-[1000] px-2.5 py-1 rounded-lg bg-neutral-900/90 text-white text-3xs font-extrabold uppercase tracking-wider backdrop-blur-xs shadow-md">
          <span>Batch {batchId}</span>
          {status && <span className="ml-1.5 text-teal-300">· {status}</span>}
        </div>
      )}
    </div>
  );
}
