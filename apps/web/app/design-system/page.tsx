"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  Store, 
  MapPin, 
  Search, 
  Lock, 
  Mail, 
  Phone, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Info,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff
} from "lucide-react";

export default function DesignSystemPreviewPage() {
  const [activeTab, setActiveTab] = useState("forms");
  const [demoText, setDemoText] = useState("Rajesh Kumar");
  const [demoSearch, setDemoSearch] = useState("");
  const [demoPassword, setDemoPassword] = useState("Password123!");
  const [showPassword, setShowPassword] = useState(false);
  const [demoLocality, setDemoLocality] = useState("khammam-central");
  const [demoNotes, setDemoNotes] = useState("Deliver to second floor apartment. Call upon arrival.");
  const [checkedTerms, setCheckedTerms] = useState(true);
  const [checkedCod, setCheckedCod] = useState(false);
  const [productQty, setProductQty] = useState(1);

  return (
    <div className="min-h-screen bg-[#F8FAFA] dark:bg-[#0B1514] text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-10">
        {/* Header Banner */}
        <div className="border border-teal-200 dark:border-teal-900/60 bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/50 dark:from-[#0f2422] dark:via-[#0B1514] dark:to-[#0f2422] p-6 sm:p-8 rounded-2xl shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0F766E]/10 dark:bg-[#34B8AB]/20 text-[#0F766E] dark:text-[#34B8AB] mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>NationX Design System 2.0 • Khammam Commerce Network</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
                Design System Preview & Component Primitives
              </h1>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-300 max-w-2xl leading-relaxed">
                A purposeful, high-contrast, Indian local commerce design system built for intense outdoor sunlight, 
                48dp touch targets, WCAG 2.1 AA accessibility, and zero AI-slop generic templates.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/">
                <Button variant="outline" size="sm">
                  Back to Overview
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-teal-100 dark:border-teal-900/40">
            <Tabs
              tabs={[
                { id: "forms", label: "Form & Input System", count: 8 },
                { id: "tokens", label: "Color Tokens & Palette", count: 7 },
                { id: "components", label: "Buttons & Badges", count: 12 },
                { id: "commerce", label: "Commerce Cards Preview", count: 3 },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>
        </div>

        {/* TAB 1: FORM & INPUT SYSTEM */}
        {activeTab === "forms" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Form & Input System</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Full 48px touch targets, readable foreground/placeholder contrast, explicit labels, and error feedback.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Standard Text Input */}
              <Card className="p-5 flex flex-col justify-between">
                <Input
                  label="Customer Full Name"
                  placeholder="e.g. Rajesh Kumar"
                  value={demoText}
                  onChange={(e) => setDemoText(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  helperText="Name as displayed on delivery address"
                  required
                />
              </Card>

              {/* Search Input */}
              <Card className="p-5 flex flex-col justify-between">
                <Input
                  label="Search Khammam Marketplace"
                  placeholder="Search biryani, sweets, groceries..."
                  value={demoSearch}
                  onChange={(e) => setDemoSearch(e.target.value)}
                  leftIcon={<Search className="w-4 h-4" />}
                  helperText="Instant filter across all 3 local shops"
                />
              </Card>

              {/* Password Input */}
              <Card className="p-5 flex flex-col justify-between">
                <Input
                  label="Account Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter strong password"
                  value={demoPassword}
                  onChange={(e) => setDemoPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 pointer-events-auto p-1 cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  helperText="Minimum 8 characters with 1 number"
                  required
                />
              </Card>

              {/* Input with Error State */}
              <Card className="p-5 flex flex-col justify-between">
                <Input
                  label="Customer Mobile Number"
                  placeholder="+91 98000 00000"
                  defaultValue="12345"
                  leftIcon={<Phone className="w-4 h-4" />}
                  error="Please enter a valid 10-digit Indian phone number (+91)"
                  required
                />
              </Card>

              {/* Success / Validated State */}
              <Card className="p-5 flex flex-col justify-between">
                <Input
                  label="Verified Delivery Locality"
                  defaultValue="Wyra Road, Khammam Central"
                  leftIcon={<MapPin className="w-4 h-4" />}
                  success
                  helperText="Within standard 15-minute shared delivery radius"
                />
              </Card>

              {/* Select Dropdown */}
              <Card className="p-5 flex flex-col justify-between">
                <Select
                  label="Locality / Neighborhood"
                  value={demoLocality}
                  onChange={(e) => setDemoLocality(e.target.value)}
                  options={[
                    { value: "khammam-central", label: "Khammam Central (RTC Bus Stand)" },
                    { value: "mayuri-centre", label: "Mayuri Centre & Bypass" },
                    { value: "station-road", label: "Station Road & Gandhi Park" },
                    { value: "mamillagudem", label: "Mamillagudem Residential" },
                  ]}
                  helperText="Delivery batches are grouped by compatible locality"
                  required
                />
              </Card>

              {/* Textarea */}
              <Card className="p-5 lg:col-span-2">
                <Textarea
                  label="Delivery Instructions / Landmark Notes"
                  placeholder="e.g. Near Gandhi Park gate, call before reaching..."
                  value={demoNotes}
                  onChange={(e) => setDemoNotes(e.target.value)}
                  maxLength={150}
                  helperText="Shared with assigned delivery partner for last-mile drop-off"
                />
              </Card>

              {/* Checkboxes */}
              <Card className="p-5 flex flex-col justify-center space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Options & Acknowledgements
                </span>
                <Checkbox
                  label="Group into Shared Batch"
                  description="Allows multi-shop routing to reduce delivery fees"
                  checked={checkedTerms}
                  onChange={(e) => setCheckedTerms(e.target.checked)}
                />
                <Checkbox
                  label="Cash on Delivery"
                  description="Pay rider ₹480 cash with explicit OTP receipt"
                  checked={checkedCod}
                  onChange={(e) => setCheckedCod(e.target.checked)}
                />
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: COLOR TOKENS & PALETTE */}
        {activeTab === "tokens" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Official NationX Color System</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Provisional tokens engineered for readability under direct Khammam sunlight and OLED dark mode.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Primary Teal */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#142321] p-4 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="h-16 w-full rounded-lg bg-[#0F766E] shadow-inner mb-3"></div>
                  <h3 className="font-bold text-sm">Primary Teal</h3>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">#0F766E</p>
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-2">
                    Main brand identity, primary CTA buttons, active state highlights.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                  <span className="text-stone-400">Contrast on White</span>
                  <span className="font-bold text-[#166534]">5.4:1 (AAA)</span>
                </div>
              </div>

              {/* Dark Primary */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#142321] p-4 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="h-16 w-full rounded-lg bg-[#34B8AB] shadow-inner mb-3"></div>
                  <h3 className="font-bold text-sm">Dark-Mode Primary</h3>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">#34B8AB</p>
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-2">
                    Luminous accents, badges, and active indicators in dark mode.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                  <span className="text-stone-400">Contrast on Dark</span>
                  <span className="font-bold text-[#166534]">9.2:1 (AAA)</span>
                </div>
              </div>

              {/* Success */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#142321] p-4 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="h-16 w-full rounded-lg bg-[#166534] shadow-inner mb-3"></div>
                  <h3 className="font-bold text-sm">Success Forest</h3>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">#166534</p>
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-2">
                    Ready suborders, verified POD codes, accepted assignments.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                  <span className="text-stone-400">Role</span>
                  <span className="font-bold text-[#166534]">COMPLETED</span>
                </div>
              </div>

              {/* Danger */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#142321] p-4 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="h-16 w-full rounded-lg bg-[#B42318] shadow-inner mb-3"></div>
                  <h3 className="font-bold text-sm">Danger Ruby</h3>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">#B42318</p>
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-2">
                    SLA breach warnings, delivery rejections, POD lockout alerts.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                  <span className="text-stone-400">Role</span>
                  <span className="font-bold text-[#B42318]">FAILED / ALERT</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BUTTONS & BADGES */}
        {activeTab === "components" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Component Primitives</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Every interactive element satisfies the minimum 48px touch target rule.
              </p>
            </div>

            <Card className="p-6 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Action Buttons
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Action (₹480)</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="outline">Outline Border</Button>
                <Button variant="success">Confirm Handover</Button>
                <Button variant="danger">Cancel Batch</Button>
                <Button variant="ghost">Dismiss</Button>
                <Button variant="primary" isLoading>
                  Verifying POD
                </Button>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
              </div>

              <div className="pt-6 border-t border-stone-200 dark:border-stone-800 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Semantic Status Badges & Chips
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="teal" icon={<Store className="w-3.5 h-3.5" />}>
                    Multi-Shop Coordinated
                  </Badge>
                  <Badge variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                    In Stock (Verified today)
                  </Badge>
                  <Badge variant="warning" icon={<Clock className="w-3.5 h-3.5" />}>
                    Call to Confirm (Stock &gt; 3d)
                  </Badge>
                  <Badge variant="danger" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
                    SLA Expiring in 8m
                  </Badge>
                  <Badge variant="neutral">Khammam Central</Badge>
                  <Badge variant="outline">Demo Policy</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <StatusBadge status="CONFIRMED" type="order" />
                  <StatusBadge status="PREPARING" type="suborder" />
                  <StatusBadge status="READY_FOR_PICKUP" type="suborder" />
                  <StatusBadge status="IN_TRANSIT" type="order" />
                  <StatusBadge status="DELIVERED" type="suborder" />
                  <StatusBadge status="COMPLETED" type="order" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: COMMERCE CARDS PREVIEW */}
        {activeTab === "commerce" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Khammam Commerce Cards Preview</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Authentic local merchant shop, product item, and multi-vendor suborder breakdown.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Shop Card */}
              <Card className="p-5 flex flex-col justify-between hover:border-[#0F766E] transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="teal" icon={<Store className="w-3.5 h-3.5" />}>
                      Restaurant
                    </Badge>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Open Now
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base text-stone-900 dark:text-white">
                    Bawarchi Biryani
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>Wyra Road, Near RTC Bus Stand</span>
                  </p>
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-3 leading-relaxed">
                    Authentic Hyderabadi mutton and chicken dum biryani, kebabs, and parathas.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                  <span className="text-stone-500">Est. Prep: 15–20 min</span>
                  <span className="font-bold text-[#0F766E] dark:text-[#34B8AB] flex items-center gap-1">
                    View 8 Items <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Card>

              {/* 2. Product Item Card with Stepper */}
              <Card className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="success" size="sm">
                      In Stock
                    </Badge>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-sm bg-amber-50 text-amber-800 border border-amber-200">
                      HOT_FOOD
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                    Special Chicken Dum Biryani
                  </h4>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Fragrant basmati rice slow-cooked with spiced chicken pieces, served with raita and salan.
                  </p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-lg font-extrabold font-mono text-stone-900 dark:text-white">
                      ₹320.00
                    </span>
                    <span className="text-xs text-stone-400">/ single pack</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <div className="flex items-center border border-stone-300 dark:border-stone-700 rounded-xl overflow-hidden bg-white dark:bg-stone-900">
                    <button
                      onClick={() => setProductQty(Math.max(1, productQty - 1))}
                      className="px-3 py-2 text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 min-h-[44px] cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 font-mono font-bold text-sm select-none">
                      {productQty}
                    </span>
                    <button
                      onClick={() => setProductQty(productQty + 1)}
                      className="px-3 py-2 text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 min-h-[44px] cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Button size="sm" variant="primary" className="flex items-center gap-1.5 shadow-xs">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Add (₹{320 * productQty})</span>
                  </Button>
                </div>
              </Card>

              {/* 3. Coordinated Shared Suborders Card */}
              <Card className="p-5 flex flex-col justify-between bg-teal-50/20 dark:bg-[#0f2422]/20 border-teal-200 dark:border-teal-900/60">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] dark:text-[#34B8AB]">
                      Coordinated Batch Stop
                    </span>
                    <StatusBadge status="READY_FOR_PICKUP" type="suborder" />
                  </div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-white">
                    Suborder #SUB-001-B
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">
                    Sri Krishna Sweets & Bakery • Opp. Gandhi Park
                  </p>

                  <div className="mt-3 p-3 bg-white dark:bg-[#142321] rounded-xl border border-stone-200 dark:border-stone-800 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Kaju Katli (250g) × 1</span>
                      <span className="font-mono font-semibold">₹160.00</span>
                    </div>
                    <div className="flex justify-between text-stone-400 text-[11px] pt-1 border-t border-stone-100 dark:border-stone-800">
                      <span>Ready since: 12:15 PM</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Packed</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-teal-100 dark:border-teal-900/40 flex items-center justify-between text-xs">
                  <span className="text-stone-500">Pickup Stop #2</span>
                  <span className="font-bold text-[#0F766E] dark:text-[#34B8AB]">Awaiting Rider</span>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

