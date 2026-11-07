"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Activity, 
  Layers, 
  ClipboardList, 
  Truck, 
  Store, 
  Users, 
  AlertTriangle, 
  DollarSign, 
  FileText, 
  Settings, 
  MapPin, 
  Compass, 
  Menu, 
  X, 
  LogOut, 
  ShieldCheck, 
  Bell, 
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/components/providers";
import { NotificationBell } from "@/components/notification-bell";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (user.role !== "ADMIN") {
        router.replace("/unauthorized");
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0F766E] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-neutral-600">Verifying administrative access...</span>
        </div>
      </div>
    );
  }

  const navSections = [
    {
      title: "Operations & Dispatch",
      items: [
        { label: "Command Center", href: "/admin", icon: Activity },
        { label: "Order Pipeline", href: "/admin/orders", icon: ClipboardList },
        { label: "Batch Operations", href: "/admin/batches", icon: Layers },
        { label: "Batch Formation Engine", href: "/admin/dispatch", icon: Compass },
        { label: "Live Fleet Monitoring", href: "/admin/live-operations", icon: Truck },
      ]
    },
    {
      title: "Network Entities",
      items: [
        { label: "Merchants & Outlets", href: "/admin/merchants", icon: Store },
        { label: "Delivery Fleet", href: "/admin/partners", icon: Users },
        { label: "Service Polygons", href: "/admin/service-zones", icon: MapPin },
      ]
    },
    {
      title: "Governance & Settlements",
      items: [
        { label: "Exceptions & Escalations", href: "/admin/exceptions", icon: AlertTriangle },
        { label: "Payouts & Settlements", href: "/admin/settlements", icon: DollarSign },
        { label: "Immutable Audit Log", href: "/admin/audit-logs", icon: FileText },
        { label: "System Parameters", href: "/admin/settings", icon: Settings },
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFA] text-[#1c1c1a]">
      {/* 1. Desktop Admin Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-[#0B1514] text-white shrink-0 border-r border-neutral-800">
        {/* Branding & Environment */}
        <div className="p-5 border-b border-neutral-800">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F766E] flex items-center justify-center font-extrabold text-white text-lg shadow-sm">
              NX
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block">
                Nation<span className="text-[#34B8AB]">X</span>
              </span>
              <span className="text-3xs uppercase font-semibold tracking-wider text-teal-400">
                Network Operations Center
              </span>
            </div>
          </Link>

          {/* Network Badge */}
          <div className="mt-4 px-3 py-2 rounded-xl bg-teal-950/40 border border-teal-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-xs font-bold text-teal-200">Khammam Sector 01</span>
            </div>
            <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-teal-900 text-teal-300">ACTIVE</span>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 p-3 space-y-6 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <span className="px-3 text-3xs uppercase font-extrabold tracking-wider text-neutral-400 block mb-2">
                {section.title}
              </span>
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      active
                        ? "bg-[#0F766E] text-white shadow-xs"
                        : "text-neutral-300 hover:text-white hover:bg-neutral-800/60"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Admin Footer Profile */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-teal-800 text-teal-200 flex items-center justify-center text-xs font-bold shrink-0">
              A
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-white block truncate">{user?.full_name || "Admin Officer"}</span>
              <span className="text-3xs text-neutral-400 block truncate">{user?.email || "ops@nationx.in"}</span>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="p-2 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin Top Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 -ml-2 rounded-lg text-neutral-700 min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500 font-medium">
              <Link href="/admin" className="hover:text-teal-700">Admin</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-neutral-900 font-bold capitalize">
                {pathname === "/admin" ? "Command Center" : pathname.split("/")[2]?.replace(/-/g, " ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-3xs font-bold text-neutral-600 bg-neutral-100 px-2.5 py-1.5 rounded-lg border border-neutral-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Engine Status: Active</span>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Mobile Slide-down Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-[#0B1514] text-white p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <span className="font-extrabold text-lg">Admin Operations Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-neutral-400 min-h-[48px] min-w-[48px] flex items-center justify-center"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mt-4 space-y-6">
                {navSections.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <span className="px-2 text-3xs uppercase font-extrabold tracking-wider text-teal-400 block mb-1">
                      {section.title}
                    </span>
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={true}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-neutral-800 min-h-[48px]"
                      >
                        <item.icon className="w-5 h-5 text-teal-400" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-6 border-t border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold block">{user?.full_name || "Admin"}</span>
                <span className="text-xs text-neutral-400 block">{user?.email}</span>
              </div>
              <button
                onClick={() => { logout(); router.push("/login"); }}
                className="px-4 py-2 rounded-xl bg-neutral-800 text-rose-400 text-xs font-bold min-h-[48px] flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}

        {/* Main Content View */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
