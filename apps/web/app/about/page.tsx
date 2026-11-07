"use client";

import React from "react";
import Link from "next/link";
import { 
  Building, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Compass, 
  Layers, 
  Users, 
  HeartHandshake
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";

export default function AboutPage() {
  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Hero Section */}
        <div className="space-y-4">
          <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-bold uppercase tracking-wider inline-block">
            About Project 03
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-neutral-950 tracking-tight">
            Building Sustainable Logistics for Real Indian Towns
          </h1>
          <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-3xl">
            In metropolitan hubs, hyper-funded aggregators burn venture capital sending separate riders for single cups of coffee. In real Indian cities like Khammam, Telangana, that math never worked.
          </p>
        </div>

        {/* The Problem & Solution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-4">
            <span className="text-3xs uppercase font-extrabold text-rose-700 tracking-wider">
              The Broken Traditional Model
            </span>
            <h3 className="text-xl font-bold text-neutral-950">
              Aggregator Commissions Destroy Local Shops
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Traditional delivery apps charge 25%–35% commissions on merchants while underpaying riders and subsidizing fuel. In Tier 2 and Tier 3 markets with average order values under ₹300, unit economics collapse.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-teal-950 text-white shadow-2xs space-y-4">
            <span className="text-3xs uppercase font-extrabold text-teal-400 tracking-wider">
              The NationX Innovation
            </span>
            <h3 className="text-xl font-bold text-white">
              Intelligent Shared-Batch Coordination
            </h3>
            <p className="text-sm text-neutral-300 leading-relaxed">
              By grouping multiple merchant suborders from adjacent shops along high-density corridors into one single delivery batch, riders double their effective earnings while merchants retain their commercial independence.
            </p>
          </div>
        </div>

        {/* Why Khammam First */}
        <div className="p-8 sm:p-10 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-neutral-950">
                Why Khammam, Telangana?
              </h2>
              <span className="text-xs text-neutral-500">Representative high-density Tier-2 commercial hub</span>
            </div>
          </div>
          <p className="text-sm text-neutral-700 leading-relaxed">
            Khammam is a vibrant commercial district in Telangana with high-density linear shopping corridors like Wyra Road, busy residential belts like Mamata Hospital Road, and an active community of independent shopkeepers. It represents thousands of Indian towns where shared delivery can dramatically improve quality of life and business resilience.
          </p>
        </div>

        {/* Contact Link */}
        <div className="p-8 rounded-3xl bg-neutral-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold">Have questions about shared delivery in Khammam?</h3>
            <p className="text-xs text-neutral-400 mt-1">Get in touch with our operations team or explore merchant and delivery partner opportunities.</p>
          </div>
          <Link
            href="/contact"
            className="px-6 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors min-h-[48px] flex items-center gap-2 shrink-0 shadow-xs"
          >
            <span>Contact Operations Team</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
