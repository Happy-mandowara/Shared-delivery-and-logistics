"use client";

import dynamic from "next/dynamic";
import React from "react";
import type { MapMarkerItem } from "./interactive-map-client";

const InteractiveMapClient = dynamic(
  () => import("./interactive-map-client"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[380px] rounded-xl bg-neutral-100 border border-neutral-200 flex flex-col items-center justify-center text-neutral-500 gap-2">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Loading Khammam map...</span>
      </div>
    ),
  }
);

interface InteractiveMapProps {
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

export function InteractiveMap(props: InteractiveMapProps) {
  return <InteractiveMapClient {...props} />;
}

export type { MapMarkerItem };

