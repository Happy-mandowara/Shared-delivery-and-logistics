"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Bike, 
  MapPin, 
  Navigation, 
  Clock, 
  IndianRupee, 
  User, 
  Settings, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle,
  History,
  Radio
} from "lucide-react";
import { useAuth } from "@/components/providers";
import { NotificationBell } from "@/components/notification-bell";

export function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  React.useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (user.role !== "PARTNER" && user.role !== "ADMIN") {
        router.replace("/unauthorized");
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user || (user.role !== "PARTNER" && user.role !== "ADMIN")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0F766E] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-neutral-600">Verifying delivery partner credentials...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Partner Cockpit", href: "/partner", icon: Bike },
    { label: "Available Batches", href: "/partner/jobs", icon: Clock },
    { label: "Active Delivery Run", href: "/partner/active-delivery", icon: Navigation },
    { label: "Run History", href: "/partner/history", icon: History },
    { label: "Earnings & Payouts", href: "/partner/earnings", icon: IndianRupee },
    { label: "Rider Profile", href: "/partner/profile", icon: User },
    { label: "Notifications", href: "/partner/notifications", icon: Bell },
    { label: "Settings", href: "/partner/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFA] text-[#1c1c1a]">
      {/* 1. Desktop Partner Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0B1514] text-white shrink-0 border-r border-neutral-800">
        {/* Branding & Status Header */}
        <div className="p-5 border-b border-neutral-800">
          <Link href="/partner" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0F766E] flex items-center justify-center font-extrabold text-white text-lg">
              NX
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block">
                Nation<span className="text-[#34B8AB]">X</span>
              </span>
              <span className="text-3xs uppercase font-semibold tracking-wider text-teal-400">
                Delivery Partner Fleet
              </span>
            </div>
          </Link>

          {/* Availability Toggle Box */}
          <div className="mt-4 p-3 rounded-xl bg-neutral-900 border border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-300">Fleet Status</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase tracking-wide ${
                isAvailable ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-neutral-800 text-neutral-400"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-emerald-400 animate-pulse" : "bg-neutral-500"}`} />
                {isAvailable ? "Available" : "Offline"}
              </span>
            </div>
            <button
              onClick={() => setIsAvailable(!isAvailable)}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-colors min-h-[44px] flex items-center justify-center gap-2 ${
                isAvailable 
                  ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
                  : "bg-[#0F766E] text-white hover:bg-[#115e59]"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              {isAvailable ? "Go Offline" : "Go Online & Accept Jobs"}
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-colors min-h-[48px] ${
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
        </nav>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-teal-800 text-teal-200 flex items-center justify-center text-xs font-bold shrink-0">
              {user?.full_name?.charAt(0) || "R"}
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-white block truncate">{user?.full_name || "Delivery Partner"}</span>
              <span className="text-3xs text-teal-400 block">Khammam Hub</span>
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
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        {/* Mobile Header (High daylight contrast, 48px targets) */}
        <header className="md:hidden sticky top-0 z-40 bg-[#0B1514] text-white px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -ml-2 rounded-lg text-neutral-300 min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link href="/partner" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center font-extrabold text-white text-sm">
                NX
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">
                Nation<span className="text-[#34B8AB]">X</span> <span className="text-xs text-teal-400 font-semibold">Partner</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAvailable(!isAvailable)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 min-h-[48px] ${
                isAvailable ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-neutral-800 text-neutral-400"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isAvailable ? "bg-emerald-400 animate-pulse" : "bg-neutral-500"}`} />
              {isAvailable ? "Online" : "Offline"}
            </button>
            <NotificationBell />
          </div>
        </header>

        {/* Mobile Slide-down Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-[#0B1514] text-white p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <span className="font-extrabold text-lg">Partner Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-neutral-400 min-h-[48px] min-w-[48px] flex items-center justify-center"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-neutral-800 min-h-[48px]"
                  >
                    <item.icon className="w-5 h-5 text-teal-400" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
            <div className="pt-6 border-t border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold block">{user?.full_name || "Partner"}</span>
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

        {/* Main View Area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (48dp Touch Targets) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B1514] border-t border-neutral-800 px-2 py-1 flex items-center justify-around">
          <Link
            href="/partner"
            prefetch={true}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-3 py-1 text-3xs font-semibold ${
              pathname === "/partner" ? "text-teal-400 font-bold" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Bike className="w-5 h-5 mb-0.5" />
            Cockpit
          </Link>
          <Link
            href="/partner/jobs"
            prefetch={true}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-3 py-1 text-3xs font-semibold ${
              pathname === "/partner/jobs" ? "text-teal-400 font-bold" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Clock className="w-5 h-5 mb-0.5" />
            Jobs
          </Link>
          <Link
            href="/partner/active-delivery"
            prefetch={true}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-3 py-1 text-3xs font-semibold ${
              pathname === "/partner/active-delivery" ? "text-teal-400 font-bold" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Navigation className="w-5 h-5 mb-0.5" />
            Active Run
          </Link>
          <Link
            href="/partner/earnings"
            prefetch={true}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-3 py-1 text-3xs font-semibold ${
              pathname === "/partner/earnings" ? "text-teal-400 font-bold" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <IndianRupee className="w-5 h-5 mb-0.5" />
            Earnings
          </Link>
          <Link
            href="/partner/profile"
            prefetch={true}
            className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-3 py-1 text-3xs font-semibold ${
              pathname === "/partner/profile" ? "text-teal-400 font-bold" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            Profile
          </Link>
        </nav>
      </div>
    </div>
  );
}
