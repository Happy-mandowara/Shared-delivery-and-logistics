"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Users, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Radio, 
  XCircle, 
  Clock, 
  Phone, 
  Mail, 
  MapPin, 
  FileText 
} from "lucide-react";
import { api } from "@/lib/api-client";

export default function AdminPartnerDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const partnerId = params?.partnerId as string;

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

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
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to update availability");
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<any>(`/admin/partners/${partnerId}/approve`, {});
      return res.data;
    },
    onSuccess: (data: any) => {
      setSuccessMsg(data?.message || "Delivery partner verified and approved successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-partner-detail", partnerId] });
      queryClient.invalidateQueries({ queryKey: ["admin-partners-dir"] });
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to verify partner");
      setTimeout(() => setErrorMsg(null), 4000);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await api.post<any>(`/admin/partners/${partnerId}/reject`, { reason });
      return res.data;
    },
    onSuccess: (data: any) => {
      setSuccessMsg(data?.message || "Delivery partner application rejected.");
      setShowRejectModal(false);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-partner-detail", partnerId] });
      queryClient.invalidateQueries({ queryKey: ["admin-partners-dir"] });
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to reject partner application");
      setTimeout(() => setErrorMsg(null), 4000);
    }
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
        <p className="text-xs text-neutral-500 mt-1 mb-4">No rider record matches ID {partnerId}.</p>
        <Link href="/admin/partners" className="text-xs font-bold text-[#0F766E] hover:underline">
          Back to Fleet Directory
        </Link>
      </div>
    );
  }

  const isVerified = Boolean(partner.verified);

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center font-bold">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-neutral-950">
                  {partner.full_name || "Delivery Partner"}
                </h1>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-3xs font-extrabold uppercase">
                    <ShieldCheck className="w-3 h-3 text-emerald-700" />
                    Verified Fleet
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-3xs font-extrabold uppercase">
                    <Clock className="w-3 h-3 text-amber-700" />
                    Pending Review
                  </span>
                )}
              </div>
              <span className="text-xs text-neutral-500 block mt-0.5">
                ID: {partner.id} · Khammam Central Fleet
              </span>
            </div>
          </div>

          <span className={`px-3 py-1 rounded-full text-3xs font-extrabold uppercase self-start sm:self-auto ${
            partner.status === "AVAILABLE" || partner.availability_status === "AVAILABLE"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-neutral-100 text-neutral-700"
          }`}>
            Status: {partner.status || partner.availability_status || "OFFLINE"}
          </span>
        </div>

        {/* Feedback Alerts */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Verification Action Banner */}
        {!isVerified ? (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider block">
                  Rider Application Pending Review
                </span>
                <p className="text-xs text-amber-800 mt-1">
                  This delivery partner has submitted an application for Khammam logistics. Review vehicle, documents, and service zone details before authorizing batch dispatch.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors min-h-[44px] flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{approveMutation.isPending ? "Verifying..." : "Approve & Authorize Partner"}</span>
              </button>

              <button
                onClick={() => setShowRejectModal(true)}
                disabled={rejectMutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-white border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold transition-colors min-h-[44px] flex items-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Application</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  Rider Verified & Authorized for Shared Batches
                </span>
                <span className="text-3xs text-emerald-700 block">
                  Eligible for multi-merchant cluster pickups and customer delivery drops.
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowRejectModal(true)}
              disabled={rejectMutation.isPending}
              className="px-3.5 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors min-h-[36px]"
            >
              Revoke Authorization
            </button>
          </div>
        )}

        {/* Reject Confirmation / Reason Modal */}
        {showRejectModal && (
          <div className="p-5 rounded-2xl bg-red-50 border border-red-200 space-y-3">
            <h4 className="text-xs font-extrabold text-red-950 uppercase tracking-wide">
              Confirm Application Decision
            </h4>
            <p className="text-xs text-red-800">
              Provide an auditable reason for rejecting or revoking this rider application. This note will be recorded in the audit log and delivered to the applicant.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Incomplete driving license proof, vehicle not suited for multi-merchant batching..."
              rows={2}
              className="w-full p-3 bg-white rounded-xl text-xs font-medium border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => rejectMutation.mutate(rejectReason)}
                disabled={rejectMutation.isPending || rejectReason.trim().length < 5}
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold transition-colors min-h-[40px] disabled:opacity-50"
              >
                {rejectMutation.isPending ? "Submitting..." : "Confirm Rejection"}
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-700 text-xs font-bold min-h-[40px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Contact & Registration Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-700">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-neutral-400 block flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone Number
            </span>
            <span className="font-semibold text-neutral-900">{partner.phone || "+91 (Khammam registered)"}</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-neutral-400 block flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email Address
            </span>
            <span className="font-semibold text-neutral-900">{partner.email || "No email linked"}</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-neutral-400 block flex items-center gap-1">
              <Truck className="w-3 h-3" /> Vehicle Specification
            </span>
            <span className="font-semibold text-neutral-900">
              {partner.vehicle_type === "TWO_WHEELER" ? "Two-Wheeler (Motorcycle / Scooter)" : (partner.vehicle_type || "Two-Wheeler")}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-neutral-400 block flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Service Area / Assigned Locality
            </span>
            <span className="font-semibold text-neutral-900">
              {partner.current_locality || "Khammam Sector 01 (Wyra Road Corridor)"}
            </span>
          </div>
        </div>

        {/* Admin Availability Override */}
        <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
          <span className="text-xs font-bold text-neutral-900 block">Manual Fleet Availability Override</span>
          <p className="text-3xs text-neutral-500">
            Override the rider's active dispatch status in case of connectivity disruptions or operational rerouting.
          </p>
          <div className="flex items-center gap-3">
            {["AVAILABLE", "BUSY", "OFFLINE"].map((st) => (
              <button
                key={st}
                onClick={() => statusMutation.mutate(st)}
                disabled={statusMutation.isPending}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors min-h-[40px] ${
                  (partner.status === st || partner.availability_status === st)
                    ? "bg-[#0F766E] text-white"
                    : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                Set {st}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
