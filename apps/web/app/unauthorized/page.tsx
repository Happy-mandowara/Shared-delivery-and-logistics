"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, User, LogOut } from "lucide-react";
import { useAuth } from "@/components/providers";

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();

  const userPortalHref =
    user?.role === "ADMIN"
      ? "/admin"
      : user?.role === "MERCHANT"
      ? "/merchant"
      : user?.role === "PARTNER"
      ? "/partner"
      : "/customer";

  return (
    <div className="min-h-screen bg-[#F8FAFA] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-neutral-200 text-center space-y-6 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-3xs font-extrabold uppercase tracking-widest text-rose-700">
            Access Restricted
          </span>
          <h1 className="text-2xl font-black text-neutral-950">
            Unauthorized Portal Access
          </h1>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Your current account role (<strong>{user?.role || "GUEST"}</strong>) does not have permission to view this operational portal.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Link
            href={userPortalHref}
            className="w-full py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-black min-h-[48px] flex items-center justify-center gap-2 shadow-xs"
          >
            <User className="w-4 h-4" />
            <span>Return to My Authorized Portal</span>
          </Link>
          <Link
            href="/login"
            onClick={() => logout()}
            className="w-full py-3 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold min-h-[44px] flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Switch Account</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

