"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  AlertTriangle, 
  Camera, 
  CheckCircle2, 
  ShieldCheck, 
  Package, 
  Send,
  AlertCircle
} from "lucide-react";
import { api } from "@/lib/api-client";
import { ImageUploader } from "@/components/ui/image-uploader";

export default function CustomerComplaintPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;

  const [category, setCategory] = useState("DAMAGED_ITEMS");
  const [description, setDescription] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch order details
  const { data: orderData } = useQuery({
    queryKey: ["customer-order-detail", orderId],
    queryFn: async () => {
      const res = await api.get<any>(`/orders/${orderId}`);
      return res.data?.order || res.data || null;
    },
    enabled: Boolean(orderId),
  });

  const order = orderData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage("Please describe the issue with your items.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post<any>("/customer/complaints", {
        orderId,
        category,
        description,
        photoUrls,
      });

      if (res.data?.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(res.data?.error?.message || "Failed to submit defect report.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href={`/customer/orders/${orderId}`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Order #{orderId?.slice(0, 8)}</span>
      </Link>

      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs space-y-6">
        <div className="space-y-1 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-neutral-950">
              Report Order Defect or Quality Issue
            </h1>
          </div>
          <p className="text-xs text-neutral-600">
            Received damaged goods, wrong items, or spillage? Upload photos for rapid dispute resolution and refund.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="p-8 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-neutral-950">Dispute Report Logged</h2>
            <p className="text-xs text-neutral-600 max-w-md mx-auto">
              Our Khammam customer resolution team has received your ticket and photo evidence. We will verify and process an instant UPI refund or replacement within 2 hours.
            </p>
            <div className="pt-2">
              <Link
                href={`/customer/orders/${orderId}`}
                className="px-6 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold inline-block"
              >
                Return to Order Details
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-900 block">
                Issue Category <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { id: "DAMAGED_ITEMS", label: "Damaged / Crushed Packaging" },
                  { id: "SPILLAGE_OR_LEAKAGE", label: "Gravy / Liquid Spillage" },
                  { id: "WRONG_ITEM_DELIVERED", label: "Wrong Item Received" },
                  { id: "MISSING_ITEMS", label: "Item Missing from Bag" },
                  { id: "EXPIRED_OR_STALE", label: "Stale / Food Quality Issue" },
                  { id: "POOR_HYGIENE", label: "Hygiene / Foreign Object" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      category === cat.id
                        ? "bg-teal-50/80 border-[#0F766E] text-[#0F766E] ring-1 ring-[#0F766E]"
                        : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Evidence */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-900 block">
                Photographic Proof of Defect
              </label>
              <p className="text-3xs text-neutral-500">
                Please attach clear photos of the damaged container, incorrect item label, or seal.
              </p>
              <ImageUploader
                value={photoUrls}
                onChange={(urls) => setPhotoUrls(Array.isArray(urls) ? urls : [urls])}
                multiple
                maxImages={4}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-900 block">
                Detailed Description of the Issue <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explain what was wrong with the package or contents..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-3xs text-neutral-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0" />
              <span>
                NationX customer assurance policy protects all verified item discrepancies with direct UPI reimbursement.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Link
                href={`/customer/orders/${orderId}`}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-bold text-neutral-700 min-h-[44px] flex items-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors min-h-[44px] flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? "Submitting Ticket..." : "Submit Defect Ticket"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

