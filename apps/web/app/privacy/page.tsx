"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, ArrowLeft, EyeOff, Database } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";

export default function PrivacyPolicyPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* Navigation & Header */}
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-bold uppercase tracking-wider inline-block">
              Data Protection & Privacy
            </span>
            <span className="text-3xs text-neutral-400 font-medium">Last updated: November 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-950 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            Your privacy and data security are foundational to NationX. This policy outlines how information is gathered, protected, and used within the Khammam shared delivery network.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-8 text-neutral-800 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-950 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0F766E]" />
              <span>1. Non-Negotiable Privacy Mandate</span>
            </h2>
            <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-950 text-xs font-medium space-y-1">
              <span className="font-bold block">Strict Customer PII Isolation:</span>
              <span>
                Under Non-Negotiable Rule 9 of the NationX Architecture, address, phone number, order items, and payment references of one customer are NEVER leaked or exposed to other customers or unauthorized parties.
              </span>
            </div>
            <p>
              In shared delivery batches, delivery partners only see the delivery destination and recipient details for the current active drop-off stop. Other order details in the batch remain masked.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-950 flex items-center gap-2">
              <Database className="w-5 h-5 text-[#0F766E]" />
              <span>2. Information We Collect</span>
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-neutral-700">
              <li>
                <strong>Account & Profile Information:</strong> Full name, verified mobile number, email address, and role.
              </li>
              <li>
                <strong>Delivery Addresses & Geolocation:</strong> Coordinates (latitude and longitude) and street addresses in Khammam provided for order pickup and drop-off fulfillment.
              </li>
              <li>
                <strong>Operational Logs & Audit Trail:</strong> State machine transitions, POD PIN verifications, dispatch assignments, and exception notes are permanently logged in <code className="bg-neutral-100 px-1 py-0.5 rounded text-xs">public.delivery_events</code> to ensure security and dispute transparency.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-950 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#0F766E]" />
              <span>3. How We Secure Your Data</span>
            </h2>
            <p>
              The NationX backend enforces mandatory PostgreSQL Row-Level Security (RLS) on all database tables. Customers can query only their own orders and wishlist items. Delivery partners can only access active batches explicitly assigned to them. Merchants can view only their own suborders and inventory.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-950">4. Third-Party Sharing</h2>
            <p>
              We do not sell, rent, or trade user personal data. Information is shared strictly with:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-neutral-700">
              <li>
                <strong>Fulfilment Partners:</strong> Only recipient name, address, and contact number needed to complete physical delivery.
              </li>
              <li>
                <strong>Authentication Infrastructure:</strong> Secure Supabase Auth for credential encryption and token issuance.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-950">5. Your Data Rights</h2>
            <p>
              Users may inspect, update, or request deletion of their account information by contacting the Khammam operations desk or submitting a request through their customer profile.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}

