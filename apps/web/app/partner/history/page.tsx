"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { History, CheckCircle2, IndianRupee, MapPin, Clock, Calendar } from "lucide-react";
import { api } from "@/lib/api-client";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function PartnerRunHistoryPage() {
  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ["partner-history-assignments"],
    queryFn: async () => {
      const res = await api.get<any>("/partners/assignments");
      const raw = res.data?.assignments || (Array.isArray(res.data) ? res.data : []);
      return raw.filter((a: any) => a.status === "COMPLETED");
    },
  });

  const runs = assignmentsData || [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Completed Batch Runs
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Permanent audit log of every fulfilled shared delivery run in Khammam.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : runs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <History className="w-12 h-12 text-neutral-300 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">No completed runs recorded</h2>
          <p className="text-xs text-neutral-500">Completed batches will automatically sync to your driver history.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs divide-y divide-neutral-100">
          {runs.map((run: any) => (
            <div
              key={run.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900">
                    Batch Run #{run.batch_id?.slice(0, 8) || run.id.slice(0, 8)}
                  </span>
                  <span className="px-2 py-0.5 rounded text-3xs font-extrabold uppercase bg-emerald-50 text-emerald-800">
                    Fulfilled
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    Wyra Road Sector 01
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    {new Date(run.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6">
                <div className="text-right">
                  <span className="text-3xs uppercase text-neutral-400 font-extrabold block">Trip Pay</span>
                  <span className="text-base font-black text-emerald-700">₹120.00</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
