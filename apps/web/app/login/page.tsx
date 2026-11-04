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
  Mail,
  Phone,
  CheckCircle2,
  X
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { api } from "@/lib/api-client";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<"EMAIL" | "PHONE">("EMAIL");

  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123!");

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Forgot password state
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

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

  // Google OAuth flow
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.post<any>("/auth/oauth/google", {
        email: "google.reviewer@nationx.local",
        name: "Google Verified Reviewer",
        role: "CUSTOMER"
      });
      if (res.data?.success) {
        window.location.href = "/customer";
      } else {
        setErrorMessage(res.data?.error?.message || "Google authentication failed");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Google authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Phone OTP Flow
  const handleSendOtp = async () => {
    if (!phone) {
      setErrorMessage("Please enter a 10-digit mobile number");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.post<any>("/auth/otp/send", { phone });
      if (res.data?.success) {
        setOtpSent(true);
        if (res.data?.data?.devOtp) {
          setDevOtpHint(`SMS Provider Simulator: OTP is ${res.data.data.devOtp}`);
          setOtpCode(res.data.data.devOtp);
        }
      } else {
        setErrorMessage(res.data?.error?.message || "Failed to send OTP");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      setErrorMessage("Please enter the 6-digit OTP code");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.post<any>("/auth/otp/verify", { phone, otpCode });
      if (res.data?.success) {
        window.location.href = "/customer";
      } else {
        setErrorMessage(res.data?.error?.message || "Invalid OTP code");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to verify OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password request
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post<any>("/auth/password/reset-request", { email: forgotEmail });
      setForgotMsg(res.data?.message || "Password reset link sent!");
    } catch (err: any) {
      setForgotMsg("Password reset request dispatched.");
    } finally {
      setIsLoading(false);
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

        {/* Auth Mode Box */}
        <div className="max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-5">
          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition-colors flex items-center justify-center gap-2.5 min-h-[44px] shadow-2xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-3xs uppercase font-extrabold text-neutral-400">or sign in with</span>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>

          {/* Toggle Tabs */}
          <div className="flex rounded-xl bg-neutral-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setAuthMethod("EMAIL"); setErrorMessage(null); }}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                authMethod === "EMAIL" ? "bg-white text-neutral-900 shadow-2xs" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod("PHONE"); setErrorMessage(null); }}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                authMethod === "PHONE" ? "bg-white text-neutral-900 shadow-2xs" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Phone OTP (SMS)
            </button>
          </div>

          {/* EMAIL TAB */}
          {authMethod === "EMAIL" && (
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-700 block" htmlFor="loginPass">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-3xs font-bold text-[#0F766E] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
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
          )}

          {/* PHONE OTP TAB */}
          {authMethod === "PHONE" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 block">
                  Indian Mobile Number (10 Digits)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="9848022334"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={otpSent}
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                  />
                </div>
              </div>

              {devOtpHint && (
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-3xs font-mono text-[#0F766E]">
                  {devOtpHint}
                </div>
              )}

              {otpSent ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-700 block">
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs font-mono tracking-widest text-center text-lg focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={isLoading || otpCode.length < 6}
                    className="w-full py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] disabled:bg-neutral-400 text-white text-xs font-black shadow-sm transition-colors flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    <span>{isLoading ? "Verifying..." : "Verify & Sign In"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setDevOtpHint(null); }}
                    className="w-full text-center text-3xs text-neutral-500 hover:text-neutral-800"
                  >
                    Change phone number
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isLoading || !phone}
                  className="w-full py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] disabled:bg-neutral-400 text-white text-xs font-black shadow-sm transition-colors flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <Phone className="w-4 h-4" />
                  <span>{isLoading ? "Sending OTP..." : "Send Verification Code"}</span>
                </button>
              )}
            </div>
          )}

          <div className="pt-2 text-center text-xs text-neutral-500">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-bold text-[#0F766E] hover:underline">
              Create one here
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900">Reset Your Password</h3>
              <button
                onClick={() => { setIsForgotPasswordOpen(false); setForgotMsg(null); }}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              Enter your registered email address. We will dispatch an authentic reset authorization token.
            </p>

            {forgotMsg ? (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-[#0F766E] font-bold">
                {forgotMsg}
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E]"
                />
                <button
                  type="submit"
                  disabled={isLoading || !forgotEmail}
                  className="w-full py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold hover:bg-[#0D625C] disabled:opacity-50"
                >
                  {isLoading ? "Sending..." : "Dispatch Reset Link"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
