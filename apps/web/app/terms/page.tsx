"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, FileText, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";

export default function TermsOfServicePage() {
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
              Legal Framework
            </span>
            <span className="text-3xs text-neutral-400 font-medium">Last updated: November 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-950 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            Please read these terms carefully before utilizing the NationX Shared Delivery platform and local commerce marketplace in Khammam, Telangana.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-8 text-neutral-800 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-950 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0F766E]" />
              <span>1. Overview & Service Model</span>
            </h2>
            <p>
              NationX Project 03 operates an intelligent shared-delivery coordination engine connecting local merchants, customers, and delivery partners across Khammam, Telangana. The platform facilitates order discovery, cluster-based dispatch batching, and coordinated last-mile delivery fulfillment.
            </p>
            <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-950 text-xs font-medium space-y-1">
              <span className="font-bold block">Non-Negotiable Batching Rule:</span>
              <span>
                Customer orders from multiple merchants are coordinated operationally into shared delivery routes to reduce fuel, congestion, and delivery costs. However, all merchant suborders, billing records, item warranties, and tax receipts remain independently auditable and commercially distinct.
              </span>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-950">2. Customer Responsibilities & Proof of Delivery (POD)</h2>
            <p>
              When placing orders via NationX, customers must ensure accurate delivery addresses and reachable phone numbers within the Khammam service zone.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-neutral-700">
              <li>
                <strong>4-Digit Secure PIN:</strong> For all deliveries, customers receive an authoritative 4-digit Proof of Delivery (POD) PIN. Handover of goods by the delivery partner requires successful verification of this PIN.
              </li>
              <li>
                <strong>Inspection upon Receipt:</strong> Customers must inspect physical parcels at handover before confirming delivery.
              </li>
              <li>
                <strong>Cancellations:</strong> Once merchant preparation has commenced or a delivery partner has been dispatched, cancellation terms are governed by the merchant's preparation status.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-950">3. Merchant Partner Obligations</h2>
            <p>
              Registered merchants in Khammam agree to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-neutral-700">
              <li>Maintain accurate stock status and pricing on the platform.</li>
              <li>Mark orders ready for pickup (<code className="bg-neutral-100 px-1 py-0.5 rounded text-xs">READY_FOR_PICKUP</code>) only after goods are packaged and available for immediate handover.</li>
              <li>Comply with local health, safety, weights, and consumer protection standards in Telangana.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-950">4. Delivery Partners & Operational Safety</h2>
            <p>
              Delivery partners operate as authorized independent logistics providers. Delivery partners must maintain valid driving credentials, follow road safety regulations, and fulfill stops strictly according to the verified sequence without unapproved detours.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-950">5. Commercial Policy & Settlement Notice</h2>
            <p className="text-xs text-neutral-600 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
              <strong>Notice regarding Commercial Calculations:</strong> Delivery fee calculations, merchant commission tiers, and delivery partner compensation parameters are designated as <em>DEMO POLICY</em> until formal commercial agreement.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-950">6. Dispute Resolution & Contact</h2>
            <p>
              Any disputes arising from orders, handovers, or payments within Khammam may be submitted via the in-app complaint center or addressed directly at the Wyra Road Operations Hub.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}

