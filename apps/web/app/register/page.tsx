"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Store, 
  Truck,
  Eye,
  EyeOff,
  MapPin,
  ShieldCheck
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/providers";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<"CUSTOMER" | "MERCHANT" | "PARTNER">("CUSTOMER");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [address, setAddress] = useState("");
  const [locality, setLocality] = useState("Khammam Central");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleChange = (newRole: "CUSTOMER" | "MERCHANT" | "PARTNER") => {
    setRole(newRole);
    setErrorMessage(null);
    if (newRole === "MERCHANT") {
      router.push("/register/shop");
    } else if (newRole === "PARTNER") {
      router.push("/register/partner");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanName || cleanName.length < 2) {
      setErrorMessage("Please enter your full legal name (minimum 2 characters).");
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setErrorMessage("Password must contain both letters and numbers.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!termsAccepted) {
      setErrorMessage("You must agree to the Terms of Service and Privacy Policy to create an account.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post<any>("/auth/register", {
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password,
        role: "CUSTOMER",
        address: address.trim() || undefined,
        locality: locality || undefined,
      });

      if (res.success || res.data?.success) {
        const token = res.data?.token || res.data?.data?.token;
        if (token) {
          api.setToken(token);
        }
        // Auto sign-in and redirect to customer portal
        router.push("/customer");
      } else {
        setErrorMessage(res.error?.message || res.data?.error?.message || "Failed to create customer account.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while creating your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-md mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0F766E] text-white font-black text-2xl shadow-md mb-1">
            NX
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Create an Account
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Join the NationX shared commerce & logistics platform in Khammam.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 sm:p-8 rounded-3xl bg-white border border-neutral-200 shadow-2xs space-y-4"
        >
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-[#B42318]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Role Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block">I want to join as</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Customer", value: "CUSTOMER" },
                { label: "Shop", value: "MERCHANT" },
                { label: "Rider", value: "PARTNER" },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => handleRoleChange(r.value as any)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                    role === r.value
                      ? "bg-[#0F766E] text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block" htmlFor="regName">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                id="regName"
                type="text"
                required
                placeholder="Ramesh Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block" htmlFor="regEmail">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                id="regEmail"
                type="email"
                required
                placeholder="ramesh@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block" htmlFor="regPhone">
              Mobile Number (Optional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                id="regPhone"
                type="tel"
                placeholder="+91 98480 12345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>
          </div>

          {/* Password with Visibility Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block" htmlFor="regPass">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                id="regPass"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Min 8 characters with letters & numbers"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 block" htmlFor="regConfirmPass">
              Confirm Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                id="regConfirmPass"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>
          </div>

          {/* Optional Initial Address */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-neutral-700 block" htmlFor="regAddress">
              Delivery Address (Optional)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                id="regAddress"
                type="text"
                placeholder="Flat / House No, Street name, Khammam"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
              />
            </div>
          </div>

          {/* Terms & Privacy Consent */}
          <div className="flex items-start gap-2.5 pt-2">
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#0F766E] focus:ring-[#0F766E] border-neutral-300"
            />
            <label htmlFor="terms" className="text-2xs text-neutral-600 leading-normal">
              I agree to the{" "}
              <Link href="/terms" className="text-[#0F766E] font-bold hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-[#0F766E] font-bold hover:underline">
                Privacy Policy
              </Link>
              . My data will never be shared with other customers.
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] disabled:bg-neutral-400 text-white text-xs font-black shadow-sm transition-colors flex items-center justify-center gap-2 min-h-[48px]"
          >
            <span>{isLoading ? "Creating Customer Account..." : "Create Customer Account"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-2 text-center text-xs text-neutral-500">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-[#0F766E] hover:underline">
              Sign in here
            </Link>
          </div>
        </form>
      </div>
    </PublicLayout>
  );
}
