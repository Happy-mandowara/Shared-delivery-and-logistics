"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/providers";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, 
  Store, 
  Truck, 
  UserCheck, 
  ArrowRight, 
  AlertCircle,
  KeyRound,
  Sparkles,
  Lock,
  Mail
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";

export default function LoginPage() {
  const { login, isDemoMode } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123!");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const demoPersonas = [
    {
      title: "Central Dispatch Ops",
      role: "ADMIN",
      email: "admin@nationx.local",
      desc: "Dispatch control, locality batching engine, partner assignment & audit logs",
      route: "/admin",
      icon: ShieldCheck,
      badgeColor: "bg-teal-100 text-teal-800",
    },
    {
      title: "Bawarchi Biryani Manager",
      role: "MERCHANT",
      email: "bawarchi@nationx.local",
      desc: "Accept incoming suborders, preparation countdown & handover verification",
      route: "/merchant",
      icon: Store,
      badgeColor: "bg-teal-50 text-teal-900",
    },
    {
      title: "Balaji Supermarket Owner",
      role: "MERCHANT",
      email: "balaji@nationx.local",
      desc: "Daily staples, pulses and sunflower oil shop inventory management",
      route: "/merchant",
      icon: Store,
      badgeColor: "bg-teal-50 text-teal-900",
    },
    {
      title: "Suresh Rider (2-Wheeler)",
      role: "DELIVERY_PARTNER",
      email: "partner1@nationx.local",
      desc: "Offered batches, multi-stop pickup & drop-off route with physical POD verification",
      route: "/partner",
      icon: Truck,
      badgeColor: "bg-indigo-100 text-indigo-800",
    },
    {
      title: "Rajesh K. (Customer)",
      role: "CUSTOMER",
      email: "customer1@nationx.local",
      desc: "Multi-shop order status, independent timelines, map tracking & POD code",
      route: "/customer",
      icon: UserCheck,
      badgeColor: "bg-amber-100 text-amber-800",
    },
  ];

  const handleDemoLogin = async (personaEmail: string, targetRoute: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    const res = await login(personaEmail, "Password123!");
    setIsLoading(false);
    if (res.success) {
      router.push(targetRoute);
    } else {
      setErrorMessage(res.error || "Login failed");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage("Please enter an email address");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    const res = await login(email, password);
    setIsLoading(false);
    if (res.success) {
      router.push("/");
    } else {
      setErrorMessage(res.error || "Invalid credentials");
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0F766E] text-white font-black text-2xl shadow-md mb-1">
            NX
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950">
            Sign In to Nation<span className="text-[#0F766E]">X</span> Khammam
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-md mx-auto">
            Choose an authoritative persona for demonstration or enter your registered account credentials.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-xs text-[#B42318] max-w-2xl mx-auto">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1-Click Demo Personas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>1-Click Evaluator Personas (Khammam Seeded Roles)</span>
            </span>
            <span className="text-3xs text-neutral-400">Authentic GoTrue JWT Auth</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {demoPersonas.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => handleDemoLogin(p.email, p.route)}
                  disabled={isLoading}
                  className="p-4 rounded-2xl bg-white border border-neutral-200/90 hover:border-teal-400 hover:shadow-md transition-all text-left flex flex-col justify-between group min-h-[140px]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-3xs font-extrabold uppercase px-2 py-0.5 rounded ${p.badgeColor}`}>
                        {p.role}
                      </span>
                      <Icon className="w-4 h-4 text-neutral-400 group-hover:text-[#0F766E] transition-colors" />
                    </div>
                    <span className="text-xs font-black text-neutral-900 block group-hover:text-[#0F766E] transition-colors">
                      {p.title}
                    </span>
                    <p className="text-3xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-3xs font-bold text-neutral-400 group-hover:text-[#0F766E]">
                    <span>{p.email}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Email & Password Form */}
        <div className="max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-4">
          <span className="text-xs font-bold text-neutral-900 block text-center">
            Or sign in with email credentials
          </span>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block" htmlFor="loginEmail">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  id="loginEmail"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 block" htmlFor="loginPass">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  id="loginPass"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] disabled:bg-neutral-400 text-white text-xs font-black shadow-sm transition-colors flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>{isLoading ? "Authenticating..." : "Sign In to Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-neutral-500">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-bold text-[#0F766E] hover:underline">
              Create one here
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
