"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Store, 
  MapPin, 
  Clock, 
  Phone, 
  Package, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle,
  AlertCircle
} from "lucide-react";
import { api } from "@/lib/api-client";

export default function AdminMerchantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const merchantId = params?.merchantId as string;
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: merchantData, isLoading } = useQuery({
    queryKey: ["admin-merchant-detail", merchantId],
    queryFn: async () => {
      const res = await api.get<any>(`/merchants/${merchantId}`);
      return res.data?.merchant || null;
    },
    enabled: Boolean(merchantId),
  });

  const { data: productsData } = useQuery({
    queryKey: ["admin-merchant-products", merchantId],
    queryFn: async () => {
      const res = await api.get<any>(`/merchants/${merchantId}/products`);
      return res.data?.products || [];
    },
    enabled: Boolean(merchantId),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ isApproved, isActive }: { isApproved?: boolean; isActive?: boolean }) => {
      const res = await api.patch<any>(`/merchants/${merchantId}`, { isApproved, isActive });
      return res.data;
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-merchant-detail", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["admin-merchants-dir"] });
      setActionMsg({
        type: "success",
        text: vars.isApproved ? "Merchant application approved and live!" : "Merchant status updated."
      });
      setTimeout(() => setActionMsg(null), 3500);
    },
    onError: (err: any) => {
      setActionMsg({ type: "error", text: err.message || "Failed to update merchant" });
    }
  });

  const merchant = merchantData;
  const products = productsData || [];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-white border border-neutral-200 animate-pulse h-96" />
    );
  }

  if (!merchant) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center bg-white rounded-3xl border border-neutral-200">
        <Store className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-neutral-900">Merchant Not Found</h2>
        <Link href="/admin/merchants" className="text-xs font-bold text-[#0F766E] hover:underline">
          Back to Directory
        </Link>
      </div>
    );
  }

  const isApproved = merchant.isApproved !== false;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/merchants"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Merchants</span>
      </Link>

      {actionMsg && (
        <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
          actionMsg.type === "success" 
            ? "bg-emerald-50 border border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border border-rose-200 text-rose-800"
        }`}>
          {actionMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center font-bold overflow-hidden shrink-0">
              {merchant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={merchant.logoUrl} alt={merchant.name} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-7 h-7" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-950">{merchant.name}</h1>
              <span className="text-xs text-neutral-500 block">
                ID: {merchant.id} · Locality: {merchant.locality || "Wyra Road Corridor"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isApproved ? (
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-3xs font-extrabold uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active Verified Outlet</span>
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-3xs font-extrabold uppercase">
                  Pending Verification
                </span>
                <button
                  onClick={() => statusMutation.mutate({ isApproved: true, isActive: true })}
                  disabled={statusMutation.isPending}
                  className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-2xs"
                >
                  Approve Application
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-neutral-700">
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-neutral-400 block">Corridor & Address</span>
            <span className="font-semibold block">{merchant.address || "Khammam Sector 01"}</span>
            <span className="text-3xs text-neutral-500">Locality: {merchant.locality}</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-neutral-400 block">Contact Phone</span>
            <span className="font-semibold block">{merchant.contactPhone || "Not specified"}</span>
            <span className="text-3xs text-neutral-500">Category: {merchant.category || "General"}</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-neutral-400 block">Catalog Offerings</span>
            <span className="font-semibold block">{products.length} Products Configured</span>
            <span className="text-3xs text-emerald-700 font-bold">In-stock & dispatch ready</span>
          </div>
        </div>

        {/* Product List */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold text-neutral-900">Current Catalog Offerings</h2>
          {products.length === 0 ? (
            <p className="text-xs text-neutral-500 p-4 bg-neutral-50 rounded-xl">No products registered yet.</p>
          ) : (
            <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
              {products.map((p: any) => (
                <div key={p.id} className="p-3.5 bg-white flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-neutral-900 block">{p.name}</span>
                    <span className="text-3xs text-neutral-400">
                      {p.category} {p.unit ? `· per ${p.unit}` : ""} · Stock: {p.stock_status}
                    </span>
                  </div>
                  <span className="font-black text-neutral-900">₹{Number(p.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
