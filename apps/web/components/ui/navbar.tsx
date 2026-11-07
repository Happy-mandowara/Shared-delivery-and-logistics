"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { useCart } from "@/components/cart-context";
import { NotificationBell } from "@/components/notification-bell";
import { 
  Truck, 
  Store, 
  UserCheck, 
  ShieldCheck, 
  LogOut, 
  Users, 
  ChevronDown, 
  ShoppingBag,
  Menu,
  X,
  MapPin
} from "lucide-react";

export function Navbar() {
  const { user, role, logout, login, isDemoMode } = useAuth();
  const { itemCount, total, openCart } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const [isSwitching, setIsSwitching] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navLinks = [
    { href: "/", label: "Marketplace", icon: Store, exact: true },
    { href: "/customer", label: "Customer Orders", icon: UserCheck },
    { href: "/merchant", label: "Merchant Portal", icon: Store },
    { href: "/partner", label: "Partner Portal", icon: Truck },
    { href: "/admin", label: "Operations Admin", icon: ShieldCheck },
  ];

  const handleQuickSwitch = async (email: string, targetPath: string) => {
    setIsSwitching(true);
    setShowRoleMenu(false);
    setShowMobileMenu(false);
    const res = await login(email, "Password123!");
    setIsSwitching(false);
    if (res.success) {
      router.push(targetPath);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Hub Tag */}
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2 group min-h-[44px]">
              <div className="w-9 h-9 rounded-xl bg-[#0F766E] flex items-center justify-center text-white font-bold text-lg shadow-xs group-hover:bg-[#0D635D] transition-colors">
                NX
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-neutral-900 leading-tight">
                  Nation<span className="text-[#0F766E]">X</span>
                </span>
                <span className="text-[11px] text-neutral-500 font-medium leading-none">
                  Khammam Shared Delivery
                </span>
              </div>
            </Link>
            <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-[#0F766E] border border-teal-200">
              <MapPin className="w-3 h-3" />
              Khammam Active
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href) && item.href !== "/";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                    isActive
                      ? "bg-teal-50 text-[#0F766E] font-semibold"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Section: Cart, Notifications, Demo Switcher, Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Basket Button */}
            <button
              onClick={openCart}
              className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-teal-50 text-[#0F766E] border border-teal-200 hover:bg-teal-100 transition-colors min-h-[44px] cursor-pointer"
              aria-label={`Open shopping basket with ${itemCount} items`}
            >
              <ShoppingBag className="w-4 h-4" />
              {itemCount > 0 ? (
                <>
                  <span className="font-bold">{itemCount}</span>
                  <span className="hidden sm:inline">· ₹{total.toFixed(0)}</span>
                </>
              ) : (
                <span className="hidden sm:inline">Basket</span>
              )}
            </button>

            {/* In-App Notification Bell */}
            <NotificationBell />

            {/* Quick Demo Switcher Dropdown */}
            {isDemoMode && (
              <div className="relative">
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  disabled={isSwitching}
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 min-h-[44px] cursor-pointer"
                  aria-label="Switch Demo Persona"
                >
                  <Users className="w-3.5 h-3.5 text-neutral-600" />
                  <span className="hidden xl:inline">Switch Persona</span>
                  <ChevronDown className="w-3 h-3 text-neutral-500" />
                </button>

                {showRoleMenu && (
                  <div
                    className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onClick={() => setShowRoleMenu(false)}
                  >
                    <div className="px-3 py-1.5 border-b border-neutral-100 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      Switch Demo Persona (Khammam)
                    </div>
                    <button
                      onClick={() => handleQuickSwitch("admin@nationx.local", "/admin")}
                      className="w-full text-left px-3 py-2 hover:bg-teal-50 flex items-center justify-between text-xs min-h-[44px]"
                    >
                      <div>
                        <div className="font-semibold text-neutral-900">Central Dispatch Ops</div>
                        <div className="text-neutral-500">admin@nationx.local</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 font-mono">ADMIN</span>
                    </button>
                    <button
                      onClick={() => handleQuickSwitch("bawarchi@nationx.local", "/merchant")}
                      className="w-full text-left px-3 py-2 hover:bg-teal-50 flex items-center justify-between text-xs min-h-[44px]"
                    >
                      <div>
                        <div className="font-semibold text-neutral-900">Bawarchi Biryani</div>
                        <div className="text-neutral-500">bawarchi@nationx.local</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-mono">SHOP</span>
                    </button>
                    <button
                      onClick={() => handleQuickSwitch("krishna@nationx.local", "/merchant")}
                      className="w-full text-left px-3 py-2 hover:bg-teal-50 flex items-center justify-between text-xs min-h-[44px]"
                    >
                      <div>
                        <div className="font-semibold text-neutral-900">Sri Krishna Sweets</div>
                        <div className="text-neutral-500">krishna@nationx.local</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 font-mono">SHOP</span>
                    </button>
                    <button
                      onClick={() => handleQuickSwitch("partner1@nationx.local", "/partner")}
                      className="w-full text-left px-3 py-2 hover:bg-teal-50 flex items-center justify-between text-xs min-h-[44px]"
                    >
                      <div>
                        <div className="font-semibold text-neutral-900">Suresh Rider</div>
                        <div className="text-neutral-500">partner1@nationx.local</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono">RIDER</span>
                    </button>
                    <button
                      onClick={() => handleQuickSwitch("customer1@nationx.local", "/customer")}
                      className="w-full text-left px-3 py-2 hover:bg-teal-50 flex items-center justify-between text-xs min-h-[44px]"
                    >
                      <div>
                        <div className="font-semibold text-neutral-900">Rajesh K. (Customer)</div>
                        <div className="text-neutral-500">customer1@nationx.local</div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">USER</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Current User Pill & Sign Out */}
            {user ? (
              <div className="flex items-center gap-1">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-neutral-800 leading-tight">
                    {user.full_name}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-medium leading-none">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3 py-2 text-xs font-semibold text-[#0F766E] hover:bg-teal-50 rounded-xl border border-teal-200 min-h-[44px] flex items-center"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Nav Toggle */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-neutral-600 hover:text-neutral-900 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {showMobileMenu && (
          <div className="md:hidden py-3 border-t border-neutral-200 animate-in fade-in duration-100 space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href) && item.href !== "/";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium min-h-[48px] ${
                    isActive
                      ? "bg-teal-50 text-[#0F766E] font-bold"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <Icon className="w-4 h-4 text-teal-700" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
