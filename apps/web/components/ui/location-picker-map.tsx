"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Search, Check, AlertCircle } from "lucide-react";
import { calculateHaversineDistanceKm } from "@nationx/shared";

interface LocationPickerMapProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number, addressHint?: string) => void;
  className?: string;
}

const KHAMMAM_LANDMARKS = [
  { name: "Wyra Road, Clock Tower", lat: 17.2472, lng: 80.1514 },
  { name: "Mamata General Hospital", lat: 17.2589, lng: 80.1422 },
  { name: "Khammam Railway Station / Gandhi Chowk", lat: 17.247, lng: 80.152 },
  { name: "Mayuri Centre Commercial Area", lat: 17.245, lng: 80.148 },
  { name: "RTC Bus Stand Road", lat: 17.251, lng: 80.158 },
  { name: "Bypass Road Junction", lat: 17.2435, lng: 80.1555 },
];

export function LocationPickerMap({
  initialLat = 17.2472,
  initialLng = 80.1514,
  onLocationSelect,
  className = "h-72",
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [currentLat, setCurrentLat] = useState(initialLat);
  const [currentLng, setCurrentLng] = useState(initialLng);
  const [searchQuery, setSearchQuery] = useState("");
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      const L = (await import("leaflet")).default;

      // Ensure leaflet styles exist
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (!mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Add service zone circle (12 km pilot coverage boundary)
      L.circle([17.2485, 80.153], {
        color: "#0F766E",
        fillColor: "#0F766E",
        fillOpacity: 0.08,
        radius: 6000,
        weight: 1.5,
        dashArray: "4, 6",
      }).addTo(map);

      // Custom draggable marker icon
      const shopIcon = L.divIcon({
        className: "custom-shop-pin",
        html: `
          <div style="
            background: #0F766E;
            color: white;
            border-radius: 9999px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(15,118,110,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            cursor: grab;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([currentLat, currentLng], {
        icon: shopIcon,
        draggable: true,
      }).addTo(map);

      marker.bindPopup(`<b>Selected Shop Location</b><br/>Lat: ${currentLat.toFixed(5)}<br/>Lng: ${currentLng.toFixed(5)}`);

      marker.on("dragend", function (e: any) {
        const coord = e.target.getLatLng();
        if (isMounted) {
          setCurrentLat(coord.lat);
          setCurrentLng(coord.lng);
          onLocationSelect(coord.lat, coord.lng);
        }
      });

      map.on("click", function (e: any) {
        marker.setLatLng(e.latlng);
        if (isMounted) {
          setCurrentLat(e.latlng.lat);
          setCurrentLng(e.latlng.lng);
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        }
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setGeoLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLat(lat);
        setCurrentLng(lng);
        onLocationSelect(lat, lng, "Current Detected GPS Position");

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
        setGeoLocating(false);
      },
      (error) => {
        setGeoLocating(false);
        setGeoError("Location permission denied or unavailable. Please pick location manually on map.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectLandmark = (item: typeof KHAMMAM_LANDMARKS[0]) => {
    setCurrentLat(item.lat);
    setCurrentLng(item.lng);
    onLocationSelect(item.lat, item.lng, item.name);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([item.lat, item.lng], 16);
      markerRef.current.setLatLng([item.lat, item.lng]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search and GPS Assist Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search Khammam landmark or street..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[40px]"
          />
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={geoLocating}
          className="px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] hover:bg-teal-100 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 min-h-[40px] shrink-0"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>{geoLocating ? "Detecting GPS..." : "Use My Current GPS"}</span>
        </button>
      </div>

      {geoError && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-3xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Suggested Quick Landmarks */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-3xs">
        <span className="font-bold text-neutral-400 whitespace-nowrap">Corridors:</span>
        {KHAMMAM_LANDMARKS.slice(0, 4).map((lm) => (
          <button
            key={lm.name}
            type="button"
            onClick={() => handleSelectLandmark(lm)}
            className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-teal-50 hover:text-[#0F766E] font-medium text-neutral-700 whitespace-nowrap transition-colors"
          >
            {lm.name.split(",")[0]}
          </button>
        ))}
      </div>

      {/* Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-neutral-200 shadow-2xs">
        <div ref={mapContainerRef} className={`w-full ${className} z-0`} />

        {/* Floating Coordinates & Help Overlay */}
        {(() => {
          const distKm = calculateHaversineDistanceKm(currentLat, currentLng, 17.2485, 80.153);
          const isEligible = distKm <= 12.0;

          return (
            <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-neutral-200 shadow-sm flex flex-wrap items-center justify-between gap-2 z-10 text-3xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0F766E] shrink-0" />
                <div>
                  <span className="font-bold text-neutral-900 block">
                    {currentLat.toFixed(5)}° N, {currentLng.toFixed(5)}° E
                  </span>
                  <span className="text-neutral-500">Tap anywhere on map or drag pin to adjust shop location</span>
                </div>
              </div>
              {isEligible ? (
                <div className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Khammam Central Zone ({distKm.toFixed(1)} km from hub)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-bold">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>Outside Service Zone ({distKm.toFixed(1)} km / 12.0 km max)</span>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

