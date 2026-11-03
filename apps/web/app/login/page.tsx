"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/ui/navbar";
import { useAuth } from "@/components/providers";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ShieldCheck, 
  Store, 
  Truck, 
  UserCheck, 
  ArrowRight, 
  AlertCircle,
  KeyRound,
  Sparkles
} from "lucide-react";

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
      title: "Sri Krishna Sweets Manager",
      role: "MERCHANT",
      email: "krishna@nationx.local",
      desc: "Bakery & pure ghee sweets suborders queue and stock catalogue management",
      route: "/merchant",
      icon: Store,
      badgeColor: "bg-teal-50 text-teal-900",
    },
    {
      title: "Balaji Kirana Owner",
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
    <div className="min-h-screen bg-[#F8FAFA] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0F766E] text-white font-bold text-2xl shadow-md mb-1">
            NX
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
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
        {isDemoMode && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                1-Click Instant Persona Sign-In (Khammam Pilot)
              </h2>
              <span className="text-[11px] font-semibold text-teal-700">6 Personas Available</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {demoPersonas.map((persona) => {
                const Icon = persona.icon;
                return (
                  <button
                    key={persona.email}
                    onClick={() => handleDemoLogin(persona.email, persona.route)}
                    disabled={isLoading}
                    className="flex flex-col justify-between text-left p-4 rounded-2xl border border-neutral-200 bg-white hover:border-[#0F766E] hover:shadow-md transition-all group min-h-[48px] cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${persona.badgeColor}`}>
                          {persona.role}
                        </span>
                      </div>

                      <div className="font-extrabold text-sm text-neutral-900 group-hover:text-[#0F766E] transition-colors">
                        {persona.title}
                      </div>

                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                        {persona.desc}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                      <span className="truncate">{persona.email}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#0F766E] group-hover:translate-x-1 transition-all shrink-0 ml-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Manual Credentials */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs max-w-xl mx-auto space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Manual Email & Password Sign In
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Enter credentials verified against GoTrue authentication.
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-neutral-700 mb-1">
                Email Address *
              </label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. customer1@nationx.local"
                className="text-xs"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-neutral-700 mb-1">
                Password *
              </label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full font-bold text-sm min-h-[48px] shadow-sm"
            >
              {isLoading ? "Signing in..." : "Sign In to NationX"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
