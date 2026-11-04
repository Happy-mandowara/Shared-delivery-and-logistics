"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X, MapPin, Store, Truck, IndianRupee } from "lucide-react";
import { api } from "@/lib/api-client";
import { RouteMap } from "@/components/ui/route-map";

export default function PartnerJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobId = params?.jobId as string;

  const { data: jobData, isLoading } = useQuery({
    queryKey: ["partner-job-detail", jobId],
    queryFn: async () => {
      const res = await api.get<any>(`/partners/assignments/${jobId}`);
      return res.data?.assignment || null;
    },
    enabled: Boolean(jobId),
  });

  const job = jobData;

  const acceptMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/partners/assignments/${jobId}/respond`, { action: "ACCEPT" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-dashboard-assignments"] });
      router.push("/partner/active-delivery");
    },
  });

  const sampleStops = [
    {
      id: "pickup-1",
      name: "Bawarchi Biryani Central",
      address: "Wyra Road, Beside Clock Tower, Khammam",
      lat: 17.2472,
      lng: 80.1514,
      type: "PICKUP" as const,
      status: "PENDING" as const,
      locality: "Wyra Road"
    },
    {
      id: "pickup-2",
      name: "Sri Balaji Supermarket",
      address: "Near Bus Station Road, Khammam",
      lat: 17.251,
      lng: 80.158,
      type: "PICKUP" as const,
      status: "PENDING" as const,
      locality: "Bus Stand Road"
    },
    {
      id: "drop-1",
      name: "Customer Drop-off (Mamata Hospital)",
      address: "Mamata General Hospital Quarters, Khammam",
      lat: 17.2589,
      lng: 80.1422,
      type: "DROPOFF" as const,
      status: "PENDING" as const,
      locality: "Mamata Hospital"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/partner/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Available Batches</span>
      </Link>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <span className="text-3xs uppercase font-extrabold text-[#0F766E] tracking-wider block">
              Manifest Inspection
            </span>
            <h1 className="text-2xl font-black text-neutral-950">
              Batch Run #{jobId.slice(0, 8)}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              className="px-6 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors min-h-[48px] flex items-center gap-2 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>{acceptMutation.isPending ? "Accepting..." : "Accept Job & Start Run"}</span>
            </button>
          </div>
        </div>

        {/* Route Preview Map */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-neutral-900 block">Planned Stop Geometry</span>
          <RouteMap stops={sampleStops} batchId={jobId} status="PENDING" className="h-64 rounded-2xl" />
        </div>

        {/* Stops Sequence */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-neutral-900 block">Stops Sequence</span>
          <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
            {sampleStops.map((stop, idx) => (
              <div key={stop.id} className="p-4 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    stop.type === "PICKUP" ? "bg-teal-100 text-[#0F766E]" : "bg-neutral-900 text-white"
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-900 block">{stop.name}</span>
                    <span className="text-3xs text-neutral-500">{stop.address}</span>
                  </div>
                </div>
                <span className="text-3xs uppercase font-extrabold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                  {stop.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
