"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Home, 
  Compass, 
  ShoppingBag, 
  Package, 
  Heart, 
  Bell, 
  User, 
  MapPin, 
  LogOut,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "@/components/providers";
import { useCart } from "@/components/cart-context";
import { CartDrawer } from "@/components/cart-drawer";
import { NotificationBell } from "@/components/notification-bell";

export function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { itemCount, openCart } = useCart();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0F766E] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-neutral-600">Verifying session...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Home", href: "/customer", icon: Home },
    { label: "Explore Shops", href: "/customer/explore", icon: Compass },
    { label: "Cart", href: "/customer/cart", icon: ShoppingBag, badge: itemCount > 0 ? itemCount : undefined },
    { label: "My Orders", href: "/customer/orders", icon: Package },
    { label: "Wishlist", href: "/customer/wishlist", icon: Heart },
    { label: "Notifications", href: "/customer/notifications", icon: Bell },
    { label: "Addresses", href: "/customer/addresses", icon: MapPin },
    { label: "Profile", href: "/customer/profile", icon: User },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFA] text-[#1c1c1a]">
      {/* 1. Customer Top Utility Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Delivery Address Pill */}
          <div className="flex items-center gap-4">
            <Link href="/customer" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#0F766E] flex items-center justify-center text-white font-extrabold text-base shadow-xs">
                NX
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base text-neutral-900 leading-tight">
                  Nation<span className="text-[#0F766E]">X</span>
                </span>
                <span className="text-3xs font-semibold uppercase tracking-wider text-neutral-500">
                  Customer Hub
                </span>
              </div>
            </Link>

            <Link
              href="/customer/addresses"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-xs font-semibold text-[#0F766E] hover:bg-teal-100 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[200px]">Wyra Road, Khammam Central</span>
              <ChevronRight className="w-3 h-3 text-teal-600" />
            </Link>
          </div>

          {/* Desktop Tab Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.slice(0, 5).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    active
                      ? "text-[#0F766E] bg-teal-50"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#0F766E] text-white text-3xs font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            <NotificationBell />

            <button
              onClick={openCart}
              className="relative flex items-center justify-center w-10 h-10 rounded-xl border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
              aria-label="Open cart"
            >
              <ShoppingBag className="w-4 h-4 text-neutral-700" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-[#0F766E] text-white text-3xs font-bold">
                  {itemCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/customer/profile"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
                >
                  <User className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span className="hidden sm:inline truncate max-w-[100px]">{user.full_name?.split(" ")[0]}</span>
                </Link>
                <button
                  onClick={() => logout().then(() => router.push("/login"))}
                  className="p-2 rounded-xl border border-neutral-200 text-neutral-500 hover:text-red-600 hover:bg-red-50"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-3.5 py-2 rounded-xl bg-[#0F766E] text-white text-xs font-semibold shadow-2xs"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Customer Screen View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-neutral-200/90 shadow-lg px-2 py-1.5 flex items-center justify-around">
        {navItems.slice(0, 5).map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-2xs font-semibold ${
                active ? "text-[#0F766E]" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <div className="relative">
                <item.icon className="w-5 h-5 mb-0.5" />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-3.5 h-3.5 px-0.5 rounded-full bg-[#0F766E] text-white text-3xs font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <CartDrawer />
    </div>
  );
}
