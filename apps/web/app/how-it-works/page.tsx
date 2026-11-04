"use client";

import React from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  Layers, 
  Truck, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Compass, 
  MapPin, 
  Clock, 
  AlertTriangle,
  FileCheck
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";

export default function HowItWorksPage() {
  const steps = [
    {
      step: "01",
      title: "Discover & Add from Multiple Shops",
      badge: "Customer Basket",
      description: "Unlike ordinary delivery apps that restrict you to one store per order, NationX lets you select biryani from Bawarchi and staples from Sri Balaji in the same session.",
      highlight: "Independent suborders preserved for financial integrity.",
      rules: [
        "Each shop prepares independently.",
        "Clear itemized bill per shop.",
        "Zero cross-shop item confusion."
      ]
    },
    {
      step: "02",
      title: "Algorithmic Batch Formation",
      badge: "Intelligent Engine",
      description: "Our batching algorithm evaluates locality matching, merchant preparation readiness, and delivery partner capacity in Khammam.",
      highlight: "No order is held past its dispatch deadline just to enlarge batch size.",
      rules: [
        "Locality grouping along high-density corridors.",
        "Hard cut-offs ensure promised customer windows are met.",
        "Two-wheeler capacity and cargo compatibility enforced."
      ]
    },
    {
      step: "03",
      title: "Coordinated Merchant Pickups",
      badge: "Rider Collection",
      description: "One delivery partner visits each participating merchant outlet in sequence. Shops hand over orders once explicitly marked READY_FOR_PICKUP.",
      highlight: "Merchant acceptance does not mean order is ready — explicit confirmation required.",
      rules: [
        "Shopkeepers confirm readiness in their portal.",
        "Delivery partner verifies items before departure.",
        "Real-time audit log records timestamp of every handover."
      ]
    },
    {
      step: "04",
      title: "Doorstep Proof of Delivery",
      badge: "Physical Verification",
      description: "Partner arrives at your door. The delivery can only be completed by entering your private 4-digit Proof of Delivery PIN.",
      highlight: "Reaching GPS destination is not proof of delivery — explicit POD required.",
      rules: [
        "4-digit PIN generated uniquely per customer.",
        "Zero fake delivery completions.",
        "Instant immutable settlement creation."
      ]
    }
  ];

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Title Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-bold uppercase tracking-wider inline-block">
            Architecture & Dispatch Rules
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-neutral-950 tracking-tight">
            How Shared Delivery Really Works
          </h1>
          <p className="text-base text-neutral-600 leading-relaxed">
            NationX Project 03 is engineered from the ground up to solve hyper-local delivery economics in Tier 2/3 Indian cities like Khammam. Here is the operational architecture behind every run.
          </p>
        </div>

        {/* 4 Architectural Steps */}
        <div className="space-y-8">
          {steps.map((s, idx) => (
            <div
              key={s.step}
              className="p-8 sm:p-10 rounded-3xl bg-white border border-neutral-200 shadow-2xs hover:border-teal-300 transition-all grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
            >
              <div className="lg:col-span-1">
                <span className="text-4xl sm:text-5xl font-black text-teal-800/80">
                  {s.step}
                </span>
              </div>
              <div className="lg:col-span-6 space-y-3">
                <span className="text-3xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
                  {s.badge}
                </span>
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                  {s.title}
                </h2>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  {s.description}
                </p>
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs font-bold text-[#0F766E]">
                  Rule: {s.highlight}
                </div>
              </div>
              <div className="lg:col-span-5 bg-[#F8FAFA] p-6 rounded-2xl border border-neutral-200 space-y-2.5">
                <span className="text-3xs font-extrabold uppercase tracking-wider text-neutral-400 block mb-2">
                  System Guardrails
                </span>
                {s.rules.map((rule) => (
                  <div key={rule} className="flex items-start gap-2 text-xs text-neutral-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Non-Negotiable Operational Pillars */}
        <div className="p-8 sm:p-10 rounded-3xl bg-[#0B1514] text-white space-y-8">
          <div className="max-w-2xl">
            <span className="text-3xs font-extrabold uppercase tracking-widest text-teal-400 block mb-2">
              Domain Integrity
            </span>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Our 4 Non-Negotiable Operational Rules
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
              <span className="text-sm font-bold text-teal-300 block">1. No Commercial Merge</span>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Orders remain separate financial contracts. We group shipments in transit, never customer balances.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
              <span className="text-sm font-bold text-teal-300 block">2. No Dispatch Holding</span>
              <p className="text-xs text-neutral-400 leading-relaxed">
                If waiting for another order risks a ready order&apos;s deadline, the ready order dispatches immediately.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
              <span className="text-sm font-bold text-teal-300 block">3. Mandatory POD</span>
              <p className="text-xs text-neutral-400 leading-relaxed">
                A rider cannot mark completed without the customer&apos;s 4-digit code. GPS proximity alone is not POD.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
              <span className="text-sm font-bold text-teal-300 block">4. Total Auditability</span>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Every transition, reassignment, and cancellation is immutably logged in PostgreSQL with actor and reason.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-6">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white font-black text-sm shadow-md transition-colors min-h-[48px]"
          >
            <span>Start an Order in Khammam</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
