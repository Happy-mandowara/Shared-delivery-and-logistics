"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Bike, Check, X, ArrowRight, Store, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function PartnerJobsPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ["partner-available-jobs"],
    queryFn: async () => {
      const res = await api.get<any>("/partners/assignments");
      return res.data?.assignments || (Array.isArray(res.data) ? res.data : []);
    },
    refetchInterval: 5000,
  });

  const assignments = assignmentsData || [];
  const availableOffers = assignments.filter((a: any) =>
    ["OFFERED", "ASSIGNED"].includes(a.status) && a.status !== "ACCEPTED" && a.status !== "REJECTED"
  );

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/partners/assignments/${id}/respond`, { accept: true, action: "ACCEPT" });
    },
    onSuccess: () => {
      setSuccessMsg("Batch job accepted! Head over to Active Run to start pickups.");
      queryClient.invalidateQueries({ queryKey: ["partner-available-jobs"] });
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to accept batch.");
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/partners/assignments/${id}/respond`, {
        accept: false,
        action: "REJECT",
        reason: "Driver opted for alternative sector",
      });
    },
    onSuccess: () => {
      setSuccessMsg("Job offer declined.");
      queryClient.invalidateQueries({ queryKey: ["partner-available-jobs"] });
      setTimeout(() => setSuccessMsg(null), 3000);
    },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Available Batches
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Review offered shared-batch runs in Khammam. Accept to lock in stops and compensation.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : availableOffers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <Clock className="w-12 h-12 text-neutral-300 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">No batch offers waiting</h2>
          <p className="text-xs text-neutral-500">
            Keep your status set to <strong>Online</strong>. When the dispatch engine matches orders, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {availableOffers.map((offer: any) => (
            <div
              key={offer.id}
              className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-neutral-900">
                      Batch #{offer.batch_id?.slice(0, 8) || offer.id.slice(0, 8)}
                    </span>
                    <span className="px-2 py-0.5 rounded text-3xs font-extrabold uppercase bg-amber-50 text-amber-800">
                      Offered Run
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500 block mt-0.5">
                    Sector: Khammam Sector 01 (Wyra Road & Mamata Hospital)
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-3xs uppercase font-extrabold text-neutral-400 block">Payout Estimate</span>
                  <span className="text-base font-black text-emerald-700">₹120.00</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <Link
                  href={`/partner/jobs/${offer.id}`}
                  className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-xs font-bold text-neutral-800 min-h-[44px] flex items-center gap-1.5"
                >
                  <span>View Full Manifest</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => declineMutation.mutate(offer.id)}
                  disabled={declineMutation.isPending}
                  className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-600 text-xs font-bold min-h-[44px]"
                >
                  Decline
                </button>

                <button
                  onClick={() => acceptMutation.mutate(offer.id)}
                  disabled={acceptMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold min-h-[44px] flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept Shared Batch</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
