"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RotateCcw, XCircle, Clock, ShieldCheck, Camera, MapPin, User } from "lucide-react";
import { api } from "@/lib/api-client";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function AdminExceptionsPage() {
  const queryClient = useQueryClient();
  const [resolvedMsg, setResolvedMsg] = useState<string | null>(null);

  // Fetch genuine partner incident reports
  const { data: incidentsData, isLoading } = useQuery({
    queryKey: ["admin-incidents-list"],
    queryFn: async () => {
      const res = await api.get<any>("/partners/incidents");
      return res.data?.incidents || [];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, action, resolutionNotes }: { id: string; action: string; resolutionNotes?: string }) => {
      const res = await api.post<any>(`/admin/incidents/${id}/resolve`, { action, resolutionNotes });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-incidents-list"] });
      setResolvedMsg(data?.message || "Incident resolved successfully.");
      setTimeout(() => setResolvedMsg(null), 3500);
    },
  });

  const liveIncidents = incidentsData || [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Exceptions & Rider Incident Cockpit
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Supervise rider emergencies, vehicular breakdowns, customer unreachable events, and physical photo evidence.
        </p>
      </div>

      {resolvedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{resolvedMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : liveIncidents.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">Zero Active Exceptions</h2>
          <p className="text-xs text-neutral-500">All rider trips and customer drop-offs in Khammam corridors are running smoothly.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {liveIncidents.map((inc: any) => {
            const isOpen = inc.status === "REPORTED" || inc.status === "OPEN";
            return (
              <div
                key={inc.id}
                className={`p-6 rounded-2xl border transition-all space-y-4 ${
                  isOpen
                    ? "bg-white border-amber-300 shadow-2xs"
                    : "bg-neutral-50 border-neutral-200 opacity-80"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      isOpen ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-black text-neutral-900 block">
                        {inc.category?.replace(/_/g, " ")}
                      </span>
                      <span className="text-3xs text-neutral-400 flex items-center gap-2 mt-0.5">
                        <span>Reported by: <strong>{inc.reporterName || "Delivery Partner"}</strong></span>
                        <span>·</span>
                        <span>{new Date(inc.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                        {inc.latitude && inc.longitude && (
                          <span className="flex items-center gap-0.5 text-teal-700">
                            <MapPin className="w-3 h-3" />
                            GPS: {Number(inc.latitude).toFixed(4)}, {Number(inc.longitude).toFixed(4)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded text-3xs font-extrabold uppercase ${
                    isOpen ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {inc.status}
                  </span>
                </div>

                <p className="text-xs text-neutral-700 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 leading-relaxed">
                  {inc.description}
                </p>

                {/* Photo Evidence if uploaded */}
                {inc.photoUrls && Array.isArray(inc.photoUrls) && inc.photoUrls.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-3xs font-bold uppercase text-neutral-500 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Rider Photo Evidence ({inc.photoUrls.length})</span>
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {inc.photoUrls.map((url: string, pIdx: number) => (
                        <a
                          key={pIdx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-20 h-20 rounded-xl bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0 hover:opacity-90 transition-opacity"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Evidence ${pIdx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution Notes if resolved */}
                {inc.resolutionNotes && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-0.5">
                    <span className="font-bold block">Resolution:</span>
                    <p>{inc.resolutionNotes}</p>
                  </div>
                )}

                {/* Action Controls for Open Incident */}
                {isOpen && (
                  <div className="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => resolveMutation.mutate({
                        id: inc.id,
                        action: "REASSIGN_PARTNER",
                        resolutionNotes: "Dispatched standby replacement rider along Wyra corridor."
                      })}
                      disabled={resolveMutation.isPending}
                      className="px-3.5 py-1.5 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100 text-[#0F766E] text-xs font-bold transition-colors"
                    >
                      Reassign Partner
                    </button>

                    <button
                      onClick={() => resolveMutation.mutate({
                        id: inc.id,
                        action: "RETURN_TO_MERCHANT",
                        resolutionNotes: "Instructed rider to safely return perishables to merchant counter."
                      })}
                      disabled={resolveMutation.isPending}
                      className="px-3.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors"
                    >
                      Return to Merchant
                    </button>

                    <button
                      onClick={() => resolveMutation.mutate({
                        id: inc.id,
                        action: "RESOLVED",
                        resolutionNotes: "Resolved manually by operations supervisor."
                      })}
                      disabled={resolveMutation.isPending}
                      className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
