"use client";

import React, { useState } from "react";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "General Inquiry",
    message: ""
  });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Title */}
        <div className="space-y-3">
          <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-xs font-bold uppercase tracking-wider inline-block">
            Field Operations Hub
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-950 tracking-tight">
            Contact the Khammam Operations Team
          </h1>
          <p className="text-neutral-600 text-sm max-w-2xl leading-relaxed">
            Need operational assistance, merchant onboarding support, or order resolution? Our physical hub team is stationed on Wyra Road.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Contact Details & Operations Desk */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-5">
              <h2 className="text-lg font-bold text-neutral-950">
                Khammam Logistics Command Center
              </h2>

              <div className="space-y-4 text-xs text-neutral-700">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-neutral-900 block">Central Hub Address</span>
                    <span>Door No. 4-2-89/1, 1st Floor, Near Clock Tower, Wyra Road, Khammam, Telangana 507001</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-neutral-900 block">Dispatch Hotline</span>
                    <span>+91 8742 223456 / +91 94900 12345</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-neutral-900 block">Operations Email</span>
                    <span>khammam.ops@nationx.in</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-neutral-900 block">Operating Hours</span>
                    <span>08:00 AM – 10:30 PM IST (Daily)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Support Notice */}
            <div className="p-5 rounded-2xl bg-[#0B1514] text-white space-y-2">
              <span className="text-3xs uppercase font-extrabold tracking-wider text-teal-400 block">
                Active Order Escalations
              </span>
              <p className="text-xs text-neutral-300 leading-relaxed">
                If you have an active order or delivery in transit with an issue, contact the rider directly via the order tracking screen or call our live dispatch desk.
              </p>
            </div>
          </div>

          {/* Inquiry Form */}
          <div className="lg:col-span-7">
            {sent ? (
              <div className="p-8 sm:p-10 rounded-3xl bg-white border border-neutral-200 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-neutral-950">Message Received</h3>
                <p className="text-sm text-neutral-600 max-w-md mx-auto">
                  Thank you, <strong>{formData.name}</strong>. Our Khammam field supervisor will review your inquiry and get back to you promptly.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-5"
              >
                <h2 className="text-lg font-bold text-neutral-950">
                  Send a Message to Khammam Operations
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-900 block" htmlFor="contactName">
                      Your Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="contactName"
                      required
                      type="text"
                      placeholder="e.g. Anand Kumar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-900 block" htmlFor="contactPhone">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="contactPhone"
                      required
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-900 block" htmlFor="contactSubject">
                    Subject / Concern
                  </label>
                  <select
                    id="contactSubject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[44px]"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Shop Partnership">Merchant Partnership Question</option>
                    <option value="Rider Opportunities">Delivery Partner Recruitment</option>
                    <option value="Order Exception">Feedback or Operational Issue</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-900 block" htmlFor="contactMsg">
                    Message Details <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="contactMsg"
                    required
                    rows={4}
                    placeholder="Describe your inquiry..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Submit Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
