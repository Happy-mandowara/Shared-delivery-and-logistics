"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Truck, CheckCircle2, AlertCircle, ShieldCheck, Radio } from "lucide-react";
import { api } from "@/lib/api-client";

export default function AdminPartnerDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const partnerId = params?.partnerId as string;

  const [overrideStatus, setOverrideStatus] = useState<string>("AVAILABLE");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: partnersData, isLoading } = useQuery({
    queryKey: ["admin-partner-detail", partnerId],
    queryFn: async () => {
      const res = await api.get<any>("/partners");
      const list = res.data?.partners || [];
      return list.find((p: any) => p.id === partnerId) || null;
    },
    enabled: Boolean(partnerId),
  });

  const partner = partnersData;

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      await api.patch("/partners/availability", { status });
    },
    onSuccess: () => {
      setSuccessMsg("Driver availability updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-partner-detail", partnerId] });
      queryClient.invalidateQueries({ queryKey: ["admin-partners-dir"] });
      setTimeout(() => setSuccessMsg(null), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-white border border-neutral-200 animate-pulse h-80" />
    );
  }

  if (!partner) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center bg-white rounded-3xl border border-neutral-200">
        <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-neutral-900">Partner Not Found</h2>
        <Link href="/admin/partners" className="text-xs font-bold text-[#0F766E] hover:underline">
          Back to Fleet Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/partners"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Fleet Directory</span>
      </Link>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center font-bold">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-950">
                {partner.full_name || "Delivery Partner"}
              </h1>
              <span className="text-xs text-neutral-500 block">
                ID: {partner.id} · Khammam Central Fleet
              </span>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-3xs font-extrabold uppercase ${
            partner.availability_status === "AVAILABLE" ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-700"
          }`}>
            {partner.availability_status || "AVAILABLE"}
          </span>
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Status Override */}
        <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
          <span className="text-xs font-bold text-neutral-900 block">Admin Availability Override</span>
          <div className="flex items-center gap-3">
            {["AVAILABLE", "BUSY", "OFFLINE"].map((st) => (
              <button
                key={st}
                onClick={() => statusMutation.mutate(st)}
                disabled={statusMutation.isPending}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors min-h-[40px] ${
                  partner.availability_status === st
                    ? "bg-[#0F766E] text-white"
                    : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                Set {st}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-700">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-neutral-400 block">Vehicle Specification</span>
            <span className="font-semibold">Hero Splendor Two-Wheeler (TS04)</span>
          </div>
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-neutral-400 block">Service Area</span>
            <span className="font-semibold">Wyra Road Corridor & Mamata Hospital Belt</span>
          </div>
        </div>
      </div>
    </div>
  );
}

