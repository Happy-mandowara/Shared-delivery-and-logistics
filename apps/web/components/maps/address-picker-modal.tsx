"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InteractiveMap } from "./interactive-map";
import { MapPin, Navigation, Check } from "lucide-react";
import { api } from "@/lib/api-client";

interface AddressPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSaved?: (newAddress: any) => void;
}

const KHAMMAM_LOCATIONS = [
  { label: "Wyra Road / Bus Stand", lat: 17.2472, lng: 80.1514, locality: "Khammam Central" },
  { label: "Mayuri Centre", lat: 17.249, lng: 80.153, locality: "Khammam Central" },
  { label: "Station Road / Railway", lat: 17.251, lng: 80.1545, locality: "Khammam Central" },
  { label: "Mamata Hospital Rd", lat: 17.253, lng: 80.156, locality: "Mamillagudem" },
  { label: "Rotary Nagar", lat: 17.258, lng: 80.158, locality: "Khammam Central" },
];

export function AddressPickerModal({ isOpen, onClose, onAddressSaved }: AddressPickerModalProps) {
  const [label, setLabel] = useState("Home");
  const [addressLine, setAddressLine] = useState("");
  const [locality, setLocality] = useState("Khammam Central");
  const [landmark, setLandmark] = useState("");
  const [coords, setCoords] = useState<[number, number]>([17.2475, 80.1518]);
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSnapLocation = (loc: (typeof KHAMMAM_LOCATIONS)[0]) => {
    setCoords([loc.lat, loc.lng]);
    setLocality(loc.locality);
    if (!landmark) setLandmark(loc.label);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (addressLine.trim().length < 5) {
      setError("Please provide a specific street address or house number (min 5 characters)");
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.post<any>("/customer/addresses", {
        label,
        addressLine: addressLine.trim(),
        locality: locality.trim(),
        landmark: landmark.trim() || undefined,
        latitude: coords[0],
        longitude: coords[1],
        isDefault,
      });

      if (res.success && res.data?.address) {
        onAddressSaved?.(res.data.address);
        onClose();
      } else {
        setError(res.error?.message || "Failed to save address");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save address");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Delivery Address in Khammam" maxWidth="max-w-2xl">
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs">
            {error}
          </div>
        )}

        {/* Quick Landmarks */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
            Quick Landmark Snapping (Khammam)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {KHAMMAM_LOCATIONS.map((loc) => (
              <button
                key={loc.label}
                type="button"
                onClick={() => handleSnapLocation(loc)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-100 hover:bg-teal-50 hover:text-teal-900 border border-neutral-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="w-3 h-3 text-teal-600" />
                {loc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Map */}
        <div>
          <div className="flex items-center justify-between text-xs text-neutral-600 mb-1">
            <span className="font-semibold text-neutral-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-red-600" /> Pin Exact Drop-off Point
            </span>
            <span className="text-[11px] font-mono text-neutral-500">
              {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
            </span>
          </div>
          <InteractiveMap
            height="220px"
            center={coords}
            isPicker
            pickerLocation={coords}
            onPickerChange={(lat, lng) => setCoords([lat, lng])}
          />
          <p className="text-[11px] text-neutral-500 mt-1">
            Drag the red pin or click anywhere on the Khammam map to adjust your delivery location.
          </p>
        </div>

        {/* Address Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Address Label
            </label>
            <div className="flex gap-2">
              {["Home", "Office", "Other"].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLabel(l)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    label === l
                      ? "bg-teal-50 border-teal-600 text-teal-800"
                      : "bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Locality / Area
            </label>
            <select
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="Khammam Central">Khammam Central</option>
              <option value="Mamillagudem">Mamillagudem</option>
              <option value="Rotary Nagar">Rotary Nagar</option>
              <option value="Revenue Colony">Revenue Colony</option>
              <option value="Bank Colony">Bank Colony</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Street Address / House / Flat No. *
          </label>
          <Input
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            placeholder="e.g. Flat 302, Sri Krishna Residency, Wyra Road"
            required
            className="text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">
            Nearby Landmark (Optional)
          </label>
          <Input
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="e.g. Opposite RTC Bus Stand / Next to Gandhi Park"
            className="text-xs"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="makeDefault"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="w-4 h-4 text-teal-600 rounded border-neutral-300 focus:ring-teal-500 cursor-pointer"
          />
          <label htmlFor="makeDefault" className="text-xs text-neutral-700 cursor-pointer">
            Set as default delivery address for checkout
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving Address..." : "Confirm & Save Address"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

