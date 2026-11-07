"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";

export interface MapMarkerItem {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  badge?: string;
  type: "merchant" | "pickup" | "dropoff" | "destination" | "partner" | "pin";
  sequenceNumber?: number;
  status?: string;
}

interface InteractiveMapClientProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarkerItem[];
  showRoutePolyline?: boolean;
  isPicker?: boolean;
  pickerLocation?: [number, number];
  onPickerChange?: (lat: number, lng: number) => void;
  className?: string;
  height?: string;
}

const KHAMMAM_DEFAULT: [number, number] = [17.2485, 80.153];

export default function InteractiveMapClient({
  center = KHAMMAM_DEFAULT,
  zoom = 14,
  markers = [],
  showRoutePolyline = false,
  isPicker = false,
  pickerLocation,
  onPickerChange,
  className = "",
  height = "380px",
}: InteractiveMapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      // Attribution control in small font
      L.control
        .attribution({ position: "bottomright", prefix: false })
        .addAttribution("Khammam Network · OpenStreetMap")
        .addTo(map);

      markerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Handle map resize on container changes
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle markers and route updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const boundsLatLngs: [number, number][] = [];

    // Helper to create HTML icon
    const createCustomIcon = (m: MapMarkerItem) => {
      let bg = "bg-[#0F766E] text-white";
      let border = "border-white";
      let label = m.sequenceNumber ? String(m.sequenceNumber) : "•";

      if (m.type === "merchant") {
        bg = "bg-teal-700 text-white";
        label = "🏪";
      } else if (m.type === "pickup") {
        bg = m.status === "COMPLETED" ? "bg-[#166534] text-white" : "bg-[#0F766E] text-white";
        label = m.sequenceNumber ? `P${m.sequenceNumber}` : "P";
      } else if (m.type === "dropoff" || m.type === "destination") {
        bg = m.status === "COMPLETED" ? "bg-[#166534] text-white" : "bg-[#92400E] text-white";
        label = m.sequenceNumber ? `D${m.sequenceNumber}` : "📍";
      } else if (m.type === "partner") {
        bg = "bg-indigo-600 text-white";
        label = "🛵";
      }

      return L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 700;
            border: 2px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            background: ${
              m.type === "merchant"
                ? "#0F766E"
                : m.type === "dropoff" || m.type === "destination"
                ? "#92400E"
                : m.status === "COMPLETED"
                ? "#166534"
                : "#0D635D"
            };
            color: #ffffff;
          ">
            ${label}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });
    };

    markers.forEach((m) => {
      boundsLatLngs.push([m.lat, m.lng]);
      const marker = L.marker([m.lat, m.lng], {
        icon: createCustomIcon(m),
      });

      const popupHtml = `
        <div style="font-family: inherit; font-size: 13px; padding: 4px;">
          ${m.badge ? `<div style="font-size: 10px; font-weight: 700; color: #0F766E; text-transform: uppercase;">${m.badge}</div>` : ""}
          <div style="font-weight: 700; color: #111; margin-top: 2px;">${m.title}</div>
          ${m.description ? `<div style="font-size: 12px; color: #555; margin-top: 3px;">${m.description}</div>` : ""}
          ${m.status ? `<div style="font-size: 11px; margin-top: 4px; font-weight: 600; color: ${m.status === 'COMPLETED' ? '#166534' : '#92400E'};">Status: ${m.status}</div>` : ""}
        </div>
      `;
      marker.bindPopup(popupHtml);
      group.addLayer(marker);
    });

    // Draw route sequence line if enabled
    if (showRoutePolyline && markers.length > 1) {
      const sorted = [...markers].sort(
        (a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)
      );
      const points: [number, number][] = sorted.map((m) => [m.lat, m.lng]);

      polylineRef.current = L.polyline(points, {
        color: "#0F766E",
        weight: 4,
        dashArray: "6, 8",
        opacity: 0.85,
      }).addTo(map);
    }

    // Fit bounds if multiple markers exist
    if (boundsLatLngs.length > 1) {
      map.fitBounds(boundsLatLngs, { padding: [40, 40] });
    }
  }, [markers, showRoutePolyline]);

  // Handle Interactive Address Picker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isPicker) return;

    const initialPos = pickerLocation || center;

    if (!pickerMarkerRef.current) {
      const pinIcon = L.divIcon({
        className: "picker-pin",
        html: `
          <div style="
            width: 36px;
            height: 36px;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #B42318;
            color: #ffffff;
            font-size: 16px;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 12px rgba(180, 35, 24, 0.4);
            cursor: grab;
          ">
            📍
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      const pickerMarker = L.marker(initialPos, {
        draggable: true,
        icon: pinIcon,
      }).addTo(map);

      pickerMarker.on("dragend", () => {
        const pos = pickerMarker.getLatLng();
        onPickerChange?.(pos.lat, pos.lng);
      });

      map.on("click", (e) => {
        pickerMarker.setLatLng(e.latlng);
        onPickerChange?.(e.latlng.lat, e.latlng.lng);
      });

      pickerMarkerRef.current = pickerMarker;
    } else if (pickerLocation) {
      pickerMarkerRef.current.setLatLng(pickerLocation);
    }
  }, [isPicker, pickerLocation, center, onPickerChange]);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: "100%", borderRadius: "12px" }}
      className={`relative z-10 border border-neutral-200 overflow-hidden shadow-2xs ${className}`}
    />
  );
}

