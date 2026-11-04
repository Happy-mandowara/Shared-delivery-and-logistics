"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShoppingBag, 
  MapPin, 
  Store, 
  Truck, 
  Menu, 
  X, 
  User, 
  ChevronRight,
  ShieldCheck,
  Compass
} from "lucide-react";
import { useAuth } from "@/components/providers";
import { useCart } from "@/components/cart-context";
import { CartDrawer } from "@/components/cart-drawer";
import { NotificationBell } from "@/components/notification-bell";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { itemCount, openCart } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Khammam Central");

  const navLinks = [
    { label: "Explore Shops", href: "/explore", icon: Compass },
    { label: "Categories", href: "/categories", icon: ShoppingBag },
    { label: "How It Works", href: "/how-it-works", icon: Truck },
    { label: "About", href: "/about", icon: Store },
    { label: "Contact", href: "/contact", icon: MapPin },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFA] text-[#1c1c1a]">
      {/* 1. Global Pilot & Zone Announcement Bar */}
      <div className="bg-[#0B1514] text-white py-2 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium tracking-wide">Live Pilot Hub:</span>
            <span className="text-neutral-300">Coordinated shared deliveries across Khammam Central & Wyra Road</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-300">
            <span className="hidden sm:inline">Telangana Urban Logistics Engine</span>
            <Link href="/register/shop" className="text-teal-300 hover:text-white underline">
              Merchant Partner Portal
            </Link>
            <Link href="/register/partner" className="text-teal-300 hover:text-white underline">
              Rider Join
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Primary Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Logo & Locality Dropdown */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[#0F766E] flex items-center justify-center text-white font-extrabold text-xl shadow-xs group-hover:scale-105 transition-transform">
                NX
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-tight text-neutral-900 leading-none">
                  Nation<span className="text-[#0F766E]">X</span>
                </span>
                <span className="text-2xs font-semibold uppercase tracking-wider text-neutral-500 mt-0.5">
                  Shared Delivery
                </span>
              </div>
            </Link>

            {/* Active Zone Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50/80 border border-teal-200 text-xs font-semibold text-[#0F766E]">
              <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>{selectedCity}</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? "text-[#0F766E] bg-teal-50"
                      : "text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Header Action Tools */}
          <div className="flex items-center gap-2.5">
            {/* In-App Notifications */}
            {user && <NotificationBell />}

            {/* Cart Trigger Button */}
            <button
              onClick={openCart}
              className="relative flex items-center justify-center w-11 h-11 rounded-xl border border-neutral-300 hover:border-neutral-400 bg-white text-neutral-800 transition-colors"
              aria-label={`Shopping cart with ${itemCount} items`}
            >
              <ShoppingBag className="w-5 h-5 text-neutral-700" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-[#0F766E] text-white text-xs font-bold shadow-xs">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Role Authentication / Switcher */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={
                    user.role === "ADMIN"
                      ? "/admin"
                      : user.role === "MERCHANT"
                      ? "/merchant"
                      : user.role === "PARTNER"
                      ? "/partner"
                      : "/customer"
                  }
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold shadow-xs"
                >
                  <User className="w-4 h-4 text-teal-400" />
                  <span className="capitalize">{user.role?.toLowerCase()} Portal</span>
                </Link>
                <button
                  onClick={() => logout()}
                  className="hidden sm:inline-flex px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-xs font-medium text-neutral-600"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-xs font-semibold text-neutral-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-11 h-11 rounded-xl border border-neutral-300 text-neutral-800"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-neutral-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg animate-in slide-in-from-top duration-200">
            <div className="p-3 bg-teal-50 rounded-xl mb-3 flex items-center justify-between text-xs text-[#0F766E] font-medium">
              <span>Location:</span>
              <span className="font-bold">{selectedCity}</span>
            </div>
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-base font-semibold ${
                    active
                      ? "text-[#0F766E] bg-teal-50"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="w-5 h-5 text-neutral-500" />
                    <span>{link.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400" />
                </Link>
              );
            })}
            {!user && (
              <div className="pt-3 border-t border-neutral-100 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl border border-neutral-300 font-semibold text-sm"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl bg-[#0F766E] text-white font-semibold text-sm shadow-xs"
                >
                  Register Account
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">{children}</main>

      {/* Multi-Vendor Cart Drawer */}
      <CartDrawer />

      {/* Global Brand Footer */}
      <footer className="bg-[#0B1514] text-white border-t border-neutral-800 pt-16 pb-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-neutral-800">
            {/* Col 1: Brand & Pilot Mission */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#0F766E] flex items-center justify-center font-bold text-white text-lg">
                  NX
                </div>
                <span className="font-extrabold text-xl tracking-tight text-white">
                  Nation<span className="text-[#34B8AB]">X</span>
                </span>
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Coordinated shared delivery engine uniting local merchants, two-wheeler delivery partners, and neighbourhood customers in Telangana.
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 rounded-lg p-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Khammam Central Pilot Operating Zone</span>
              </div>
            </div>

            {/* Col 2: Marketplace */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300">Marketplace</h3>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><Link href="/explore" className="hover:text-white transition-colors">Explore All Shops</Link></li>
                <li><Link href="/categories" className="hover:text-white transition-colors">Browse Categories</Link></li>
                <li><Link href="/customer/orders" className="hover:text-white transition-colors">Track Your Order</Link></li>
                <li><Link href="/customer/cart" className="hover:text-white transition-colors">Multi-Shop Cart</Link></li>
              </ul>
            </div>

            {/* Col 3: Partners & Merchants */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300">Partnership</h3>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><Link href="/register/shop" className="hover:text-white transition-colors">Register Your Shop</Link></li>
                <li><Link href="/register/partner" className="hover:text-white transition-colors">Become a Delivery Partner</Link></li>
                <li><Link href="/merchant" className="hover:text-white transition-colors">Merchant Dashboard</Link></li>
                <li><Link href="/partner" className="hover:text-white transition-colors">Partner Driver Cockpit</Link></li>
                <li><Link href="/admin" className="hover:text-white transition-colors">Central Dispatch Admin</Link></li>
              </ul>
            </div>

            {/* Col 4: Platform & Support */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300">Support & Legal</h3>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><Link href="/how-it-works" className="hover:text-white transition-colors">How Shared Delivery Works</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Customer Help & Support</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400 border-t border-neutral-800">
            <p>© {new Date().getFullYear()} NationX Technologies Inc. All rights reserved.</p>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <span>·</span>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <span>·</span>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
