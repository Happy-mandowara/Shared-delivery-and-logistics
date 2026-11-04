"use client";

import React, { useState } from "react";
import { MapPin, Plus, Trash2, CheckCircle2, Home, Building2, Users } from "lucide-react";

export default function CustomerAddressesPage() {
  const [addresses, setAddresses] = useState([
    {
      id: "addr-1",
      label: "Home",
      address: "Mamata General Hospital Quarters, Block B, Wyra Road, Khammam",
      locality: "Mamata Hospital Road",
      isDefault: true,
      icon: Home
    },
    {
      id: "addr-2",
      label: "Office",
      address: "Shop 14, Opposite Municipal Office, Wyra Road, Khammam",
      locality: "Wyra Road",
      isDefault: false,
      icon: Building2
    },
    {
      id: "addr-3",
      label: "Family Residence",
      address: "Plot 42, Bank Colony, Khammam",
      locality: "Bypass Road",
      isDefault: false,
      icon: Users
    }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newLocality, setNewLocality] = useState("Wyra Road");

  const handleSetDefault = (id: string) => {
    setAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })));
  };

  const handleDelete = (id: string) => {
    setAddresses(addresses.filter(a => a.id !== id));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newAddress) return;
    setAddresses([
      ...addresses,
      {
        id: `addr-${Date.now()}`,
        label: newLabel,
        address: newAddress,
        locality: newLocality,
        isDefault: false,
        icon: MapPin
      }
    ]);
    setShowAddModal(false);
    setNewLabel("");
    setNewAddress("");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Saved Addresses
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Delivery destinations for fast checkout within the Khammam pilot zone.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Address</span>
        </button>
      </div>

      <div className="space-y-4">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className={`p-5 rounded-2xl bg-white border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              addr.isDefault ? "border-[#0F766E] ring-1 ring-[#0F766E]/40" : "border-neutral-200"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                addr.isDefault ? "bg-teal-100 text-[#0F766E]" : "bg-neutral-100 text-neutral-600"
              }`}>
                <addr.icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900">{addr.label}</span>
                  {addr.isDefault && (
                    <span className="px-2 py-0.5 rounded text-3xs font-extrabold uppercase bg-teal-50 text-[#0F766E]">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-600 max-w-lg">{addr.address}</p>
                <span className="text-3xs text-neutral-400 font-medium block">
                  Sector: {addr.locality}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {!addr.isDefault && (
                <button
                  onClick={() => handleSetDefault(addr.id)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-3xs font-bold text-neutral-700 min-h-[36px]"
                >
                  Set as Default
                </button>
              )}
              {addresses.length > 1 && (
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="p-2 text-neutral-400 hover:text-rose-600 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Delete address"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Address Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAdd}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-xl"
          >
            <div className="flex items-center gap-2 text-neutral-900">
              <MapPin className="w-5 h-5 text-[#0F766E]" />
              <h3 className="text-lg font-bold">Add Delivery Address</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">Address Label</label>
              <input
                type="text"
                required
                placeholder="e.g. Grandma's House"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">Khammam Locality</label>
              <select
                value={newLocality}
                onChange={(e) => setNewLocality(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[44px]"
              >
                <option value="Wyra Road">Wyra Road Corridor</option>
                <option value="Mamata Hospital Road">Mamata Hospital Road</option>
                <option value="Gandhi Chowk">Gandhi Chowk</option>
                <option value="Bypass Road">Bypass Road</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block">Full Door / Street Address</label>
              <textarea
                required
                rows={2}
                placeholder="Door No, Street Name, Landmark, Khammam"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#0F766E] text-white text-xs font-bold min-h-[44px]"
              >
                Save Location
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
