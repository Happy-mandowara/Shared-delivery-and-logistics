"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Store,
  ClipboardList,
  Package,
  Layers,
  Truck,
  CheckCircle2,
  DollarSign,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  Plus,
  Clock,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/components/providers";
import { NotificationBell } from "@/components/notification-bell";
import { api } from "@/lib/api-client";

export function MerchantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [merchant, setMerchant] = useState<{ name?: string; logoUrl?: string; locality?: string } | null>(null);

  React.useEffect(() => {
    if (user) {
      api.get<any>("/merchants/me").then((res) => {
        if (res.data?.merchant) {
          setMerchant(res.data.merchant);
        }
      }).catch(() => {});
    }
  }, [user]);

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (user.role !== "MERCHANT" && user.role !== "ADMIN") {
        router.replace("/unauthorized");
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user || (user.role !== "MERCHANT" && user.role !== "ADMIN")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0F766E] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-neutral-600">Verifying merchant credentials...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Overview", href: "/merchant", icon: Store },
    { label: "Orders Queue", href: "/merchant/orders", icon: ClipboardList },
    { label: "Products Catalogue", href: "/merchant/products", icon: Package },
    { label: "Stock Inventory", href: "/merchant/inventory", icon: Layers },
    { label: "Staged Pickups", href: "/merchant/pickups", icon: Clock },
    { label: "Delivery History", href: "/merchant/deliveries", icon: Truck },
    { label: "Earnings & Payouts", href: "/merchant/earnings", icon: DollarSign },
    { label: "Shop Profile", href: "/merchant/shop-profile", icon: Store },
    { label: "Notifications", href: "/merchant/notifications", icon: Bell },
    { label: "Settings", href: "/merchant/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFA] text-[#1c1c1a]">
      {/* 1. Merchant Left Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0B1514] text-white shrink-0 border-r border-neutral-800">
        {/* Merchant Branding Header */}
        <div className="p-5 border-b border-neutral-800">
          <Link href="/merchant" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0F766E] flex items-center justify-center font-extrabold text-white text-lg">
              NX
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block">
                Nation<span className="text-[#34B8AB]">X</span>
              </span>
              <span className="text-3xs uppercase font-semibold tracking-wider text-teal-400">
                Merchant Operations
              </span>
            </div>
          </Link>

          {/* Active Store Chip */}
          <div className="mt-4 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 truncate">
              {merchant?.logoUrl ? (
                <img
                  src={merchant.logoUrl}
                  alt={merchant.name || "Store"}
                  className="w-8 h-8 rounded-lg object-cover border border-neutral-700 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-teal-900/60 border border-teal-700/50 flex items-center justify-center text-teal-300 font-bold text-xs shrink-0">
                  <Store className="w-4 h-4" />
                </div>
              )}
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate">
                  {merchant?.name || user?.full_name || "Merchant Shop"}
                </span>
                <span className="text-3xs text-neutral-400 block truncate">
                  {merchant?.locality || "Khammam Central Corridor"}
                </span>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" title="Store Open" />
          </div>
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${active
                  ? "bg-[#0F766E] text-white shadow-xs"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800/60"
                  }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Add Product Button */}
        <div className="p-3 border-t border-neutral-800">
          <Link
            href="/merchant/products/new"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Link>
        </div>

        {/* Merchant Footer Profile & Sign Out */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between">
          <div className="truncate text-xs">
            <span className="text-neutral-400 block truncate">{user?.email}</span>
            <span className="text-3xs text-emerald-400 font-semibold">Verified Merchant</span>
          </div>
          <button
            onClick={() => logout().then(() => router.push("/login"))}
            className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-900 rounded-lg"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 2. Merchant Mobile Header & Hamburger */}
      <header className="md:hidden sticky top-0 z-40 bg-[#0B1514] text-white px-4 h-16 flex items-center justify-between border-b border-neutral-800 shadow-sm">
        <Link href="/merchant" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center font-bold text-white text-sm">
            NX
          </div>
          <span className="font-extrabold text-sm text-white">
            Merchant Operations
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg border border-neutral-700 text-neutral-200"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-30 bg-[#0B1514] text-white p-4 space-y-2 overflow-y-auto animate-in slide-in-from-top duration-200">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold ${active ? "bg-[#0F766E] text-white" : "text-neutral-300 hover:bg-neutral-800"
                  }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-4 border-t border-neutral-800 flex flex-col gap-2">
            <Link
              href="/merchant/products/new"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 rounded-xl bg-teal-600 text-white font-bold text-sm shadow-xs"
            >
              + Add New Product
            </Link>
            <button
              onClick={() => logout().then(() => router.push("/login"))}
              className="w-full py-3 rounded-xl border border-neutral-700 text-neutral-300 font-medium text-sm hover:bg-neutral-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Workspace Area */}
      <main className="flex-1 overflow-y-auto max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
