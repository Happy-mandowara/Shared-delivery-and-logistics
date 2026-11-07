"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Store, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck, 
  Clock, 
  AlertCircle,
  Sparkles,
  Upload,
  Camera,
  Utensils,
  ShoppingBag,
  CreditCard,
  FileText,
  Eye,
  Plus,
  Trash2,
  Save,
  HelpCircle
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { api } from "@/lib/api-client";
import { ImageUploader } from "@/components/ui/image-uploader";
import { LocationPickerMap } from "@/components/ui/location-picker-map";

const ONBOARDING_STEPS = [
  { step: 1, title: "Basic Info", icon: Store, desc: "Outlet & contact details" },
  { step: 2, title: "Category", icon: Utensils, desc: "Type of commerce" },
  { step: 3, title: "Location", icon: MapPin, desc: "Corridor & address" },
  { step: 4, title: "Photos", icon: Camera, desc: "Storefront & branding" },
  { step: 5, title: "Hours", icon: Clock, desc: "Operating schedule" },
  { step: 6, title: "Kitchen Prep", icon: Sparkles, desc: "Order capacity & SLAs" },
  { step: 7, title: "Starter Menu", icon: ShoppingBag, desc: "Initial products" },
  { step: 8, title: "Bank & Payouts", icon: CreditCard, desc: "Settlement account" },
  { step: 9, title: "KYC & Licenses", icon: FileText, desc: "FSSAI & GSTIN" },
  { step: 10, title: "Final Review", icon: Eye, desc: "Storefront preview" },
];

export default function RegisterShopPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Basic
    shopName: "",
    legalEntityName: "",
    ownerName: "",
    phone: "",
    email: "",
    whatsapp: "",
    // Step 2: Category
    category: "Restaurants",
    cuisineTags: ["South Indian", "Biryani"],
    // Step 3: Location
    locality: "Wyra Road",
    address: "",
    landmark: "",
    pincode: "507001",
    latitude: 17.2473,
    longitude: 80.1514,
    // Step 4: Photos
    logoUrl: "",
    coverUrl: "",
    galleryUrls: [] as string[],
    // Step 5: Hours
    openTime: "09:00",
    closeTime: "22:30",
    closedDay: "None",
    // Step 6: Kitchen / Capacity
    preparationTimeMinutes: 20,
    packagingType: "THERMAL_INSULATED",
    orderCapacityPerHour: 30,
    // Step 7: Starter Menu
    starterProducts: [
      { name: "Special Chicken Biryani", price: "240", unit: "plate", description: "Authentic slow cooked dum biryani" }
    ],
    // Step 8: Bank
    bankAccountHolder: "",
    bankAccountNumber: "",
    bankIfscCode: "",
    bankName: "State Bank of India",
    payoutUpiId: "",
    // Step 9: KYC
    fssaiNumber: "",
    gstin: "",
    panNumber: "",
    // Step 10: Declarations
    agreeToTerms: true,
  });

  // Pre-fill realistic Khammam merchant demo data
  const handlePreFillDemo = () => {
    setFormData({
      shopName: "Kakatiya Deluxe Mess & Sweets",
      legalEntityName: "Kakatiya Foods Pvt Ltd",
      ownerName: "Venkata Raman Rao",
      phone: "9848022334",
      email: "kakatiya.khammam@gmail.com",
      whatsapp: "9848022334",
      category: "Restaurants",
      cuisineTags: ["Andhra Thali", "South Indian", "Biryani"],
      locality: "Wyra Road",
      address: "D.No 4-2-192, Wyra Road, Near Old Bus Stand, Khammam",
      landmark: "Opposite Andhra Bank",
      pincode: "507001",
      latitude: 17.2472,
      longitude: 80.1514,
      logoUrl: "",
      coverUrl: "",
      galleryUrls: [],
      openTime: "07:30",
      closeTime: "22:30",
      closedDay: "None",
      preparationTimeMinutes: 15,
      packagingType: "THERMAL_INSULATED",
      orderCapacityPerHour: 40,
      starterProducts: [
        { name: "Special Andhra Meals (Full)", price: "180", unit: "plate", description: "Pappu, Sambar, Rasam, 2 Curries, Fry, Curd & Sweets" },
        { name: "Chicken 65 Dry", price: "220", unit: "plate", description: "Crispy fried spicy boneless chicken" },
        { name: "Pootharekulu (Pack of 5)", price: "150", unit: "packet", description: "Traditional paper sweet with ghee and jaggery" }
      ],
      bankAccountHolder: "Kakatiya Foods Pvt Ltd",
      bankAccountNumber: "50100492819281",
      bankIfscCode: "SBIN0000854",
      bankName: "State Bank of India, Khammam Main",
      payoutUpiId: "kakatiyafoods@sbi",
      fssaiNumber: "13622014000182",
      gstin: "36AABCK1234F1Z8",
      panNumber: "AABCK1234F",
      agreeToTerms: true,
    });
    setMaxStepReached(10);
    setSaveMessage("Sample merchant details loaded!");
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Load existing draft if available
  useEffect(() => {
    const fetchDraft = async () => {
      try {
        const res = await api.get<any>("/merchants/onboarding");
        if (res.data?.draft?.draftData) {
          setFormData((prev) => ({ ...prev, ...res.data.draft.draftData }));
          if (res.data.draft.currentStep) {
            setCurrentStep(res.data.draft.currentStep);
            setMaxStepReached((prev) => Math.max(prev, res.data.draft.currentStep));
          }
        }
      } catch (err) {
        // Fallback gracefully to empty state
      }
    };
    fetchDraft();
  }, []);

  // Step Validation for strictly unidirectional progression
  const validateCurrentStep = (step: number): { valid: boolean; error?: string } => {
    switch (step) {
      case 1:
        if (!formData.shopName || formData.shopName.trim().length < 2) {
          return { valid: false, error: "Please enter your Shop / Trade Name (minimum 2 characters)." };
        }
        if (!formData.ownerName || formData.ownerName.trim().length < 2) {
          return { valid: false, error: "Please enter the Proprietor / Contact Person name." };
        }
        if (!formData.phone || formData.phone.replace(/[\s\-\+]/g, "").length < 10) {
          return { valid: false, error: "Please provide a valid 10-digit mobile phone number." };
        }
        return { valid: true };
      case 2:
        if (!formData.category) {
          return { valid: false, error: "Please select your primary commerce category." };
        }
        return { valid: true };
      case 3:
        if (!formData.address || formData.address.trim().length < 3) {
          return { valid: false, error: "Please enter your shop's physical street address." };
        }
        if (!formData.locality) {
          return { valid: false, error: "Please select your corridor locality in Khammam." };
        }
        return { valid: true };
      default:
        return { valid: true };
    }
  };

  // Save draft helper
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setSaveMessage(null);
    try {
      await api.post("/merchants/onboarding", {
        currentStep,
        draftData: formData,
        isSubmitted: false
      });
      setSaveMessage("Progress saved successfully!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage("Could not save online. Local copy preserved.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Step 10 Final Submit
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.post<any>("/merchants/onboarding", {
        currentStep: 10,
        draftData: formData,
        submitApplication: true
      });

      if (res.success || res.data?.success) {
        const token = res.data?.token || res.data?.data?.token;
        if (token) {
          api.setToken(token);
        }
        setIsSubmittedSuccess(true);
      } else {
        setErrorMessage(res.error?.message || "Submission failed. Please verify required fields.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    const val = validateCurrentStep(currentStep);
    if (!val.valid) {
      setErrorMessage(val.error || "Please complete the required fields before continuing.");
      window.scrollTo({ top: 120, behavior: "smooth" });
      return;
    }

    setErrorMessage(null);
    handleSaveDraft();
    const next = Math.min(currentStep + 1, 10);
    setMaxStepReached((prev) => Math.max(prev, next));
    setCurrentStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-3xs font-extrabold uppercase tracking-wider">
              <Store className="w-3.5 h-3.5" />
              <span>NationX Merchant Partner Onboarding</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
              Register Your Khammam Outlet
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600">
              Join the shared delivery corridor. Reach customers across Khammam without prohibitive aggregator cuts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePreFillDemo}
              className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0F766E] text-xs font-bold transition-colors border border-teal-200 flex items-center gap-1.5 min-h-[40px]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Fill Sample Data</span>
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[40px]"
            >
              <Save className="w-3.5 h-3.5 text-neutral-500" />
              <span>{isSavingDraft ? "Saving..." : "Save Draft"}</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {saveMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Screen */}
        {isSubmittedSuccess ? (
          <div className="p-8 sm:p-12 rounded-3xl bg-white border border-neutral-200 shadow-sm text-center space-y-5">
            <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-neutral-950">Application Submitted!</h2>
              <p className="text-sm text-neutral-600 max-w-lg mx-auto">
                Thank you, <strong>{formData.ownerName || "Partner"}</strong>. Your merchant profile for <strong>{formData.shopName}</strong> on {formData.locality} has been received by our Khammam operations cockpit.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Application Status:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  PENDING VERIFICATION
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Service Corridor:</span>
                <span className="font-bold text-neutral-900">{formData.locality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Turnaround SLA:</span>
                <span className="font-bold text-neutral-900">Within 24 working hours</span>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/merchant"
                className="px-6 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold min-h-[48px] inline-flex items-center gap-2 shadow-xs"
              >
                <span>Enter Merchant Operations Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-bold min-h-[48px] inline-flex items-center"
              >
                Sign In Screen
              </Link>
              <Link
                href="/explore"
                className="px-6 py-3 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-bold min-h-[48px] inline-flex items-center"
              >
                Explore Active Shops
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sleek, Compact 10-Step Progress Strip */}
            <div className="bg-white p-4 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-3">
              {/* Stepper Status Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E] text-3xs font-extrabold uppercase tracking-wider">
                    Step {currentStep} of 10
                  </span>
                  <span className="font-extrabold text-neutral-900">
                    {ONBOARDING_STEPS[currentStep - 1].title}
                  </span>
                  <span className="text-neutral-400 hidden md:inline">·</span>
                  <span className="text-neutral-500 text-3xs hidden md:inline">
                    {ONBOARDING_STEPS[currentStep - 1].desc}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-3xs font-semibold text-neutral-500">
                  <span>{Math.round((currentStep / 10) * 100)}% Completed</span>
                  <span className="text-neutral-300">|</span>
                  <span className="text-teal-700">Sequential verification</span>
                </div>
              </div>

              {/* Slim Progress Bar */}
              <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#0F766E] rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(currentStep / 10) * 100}%` }}
                />
              </div>

              {/* Compact Step Icons & Labels */}
              <div className="flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {ONBOARDING_STEPS.map((s) => {
                  const isCurrent = currentStep === s.step;
                  const isCompleted = currentStep > s.step;
                  const isAccessible = s.step <= maxStepReached;

                  return (
                    <button
                      key={s.step}
                      type="button"
                      disabled={!isAccessible}
                      onClick={() => {
                        if (isAccessible) {
                          setErrorMessage(null);
                          setCurrentStep(s.step);
                        }
                      }}
                      className={`flex-1 min-w-[58px] sm:min-w-[70px] flex flex-col items-center text-center p-1.5 rounded-xl transition-all ${
                        isCurrent
                          ? "bg-teal-50/80 border border-teal-300 text-[#0F766E] font-bold"
                          : isCompleted
                          ? "text-emerald-700 hover:bg-neutral-50 cursor-pointer"
                          : isAccessible
                          ? "text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                          : "text-neutral-300 opacity-40 cursor-not-allowed"
                      }`}
                      title={!isAccessible ? "Step locked: Complete previous stages sequentially" : s.title}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-3xs font-black mb-1 transition-transform ${
                        isCurrent
                          ? "bg-[#0F766E] text-white shadow-xs scale-105"
                          : isCompleted
                          ? "bg-emerald-600 text-white"
                          : isAccessible
                          ? "bg-neutral-200 text-neutral-700"
                          : "bg-neutral-100 text-neutral-400"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.step}
                      </div>
                      <span className="text-3xs font-extrabold uppercase tracking-tight block truncate w-full text-[10px] leading-tight">
                        {s.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step Content Container */}
            <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xs p-6 sm:p-10 space-y-6">
              {/* Step Title Header */}
              <div className="space-y-1 pb-4 border-b border-neutral-100">
                <span className="text-3xs font-extrabold text-[#0F766E] uppercase tracking-wider">
                  Step {currentStep} of 10
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-neutral-950">
                  {ONBOARDING_STEPS[currentStep - 1].title} — {ONBOARDING_STEPS[currentStep - 1].desc}
                </h2>
              </div>

              {/* STEP 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">
                        Shop / Trade Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kakatiya Deluxe Mess"
                        value={formData.shopName}
                        onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">
                        Legal Business Entity Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Kakatiya Foods Private Limited"
                        value={formData.legalEntityName}
                        onChange={(e) => setFormData({ ...formData, legalEntityName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">
                        Proprietor / Contact Person <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Venkata Raman Rao"
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">
                        Primary Mobile Phone <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="9848022334"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">
                        Business Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="shop@domain.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Category & Tags */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { id: "Restaurants", label: "Restaurants & Hot Food", desc: "Meals, biryanis, snacks, tiffins" },
                      { id: "Groceries", label: "Groceries & Kirana", desc: "Atta, pulses, oils, spices, FMCG" },
                      { id: "Dairy", label: "Dairy & Milk", desc: "Fresh milk, curd, paneer, butter" },
                      { id: "Produce", label: "Produce & Veggies", desc: "Fresh vegetables and seasonal fruits" },
                      { id: "Pharmacy", label: "Pharmacy & Health", desc: "OTC medicine and hygiene essentials" },
                      { id: "Sweets", label: "Sweets & Bakery", desc: "Traditional sweets, cakes, and dry fruits" },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.id })}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          formData.category === cat.id
                            ? "bg-teal-50/70 border-[#0F766E] ring-2 ring-[#0F766E]/20"
                            : "border-neutral-200 hover:border-neutral-300 bg-white"
                        }`}
                      >
                        <h4 className="text-sm font-black text-neutral-900">{cat.label}</h4>
                        <p className="text-3xs text-neutral-500 mt-1">{cat.desc}</p>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-900 block">
                      Cuisine or Speciality Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["Pure Veg", "South Indian", "Biryani", "Andhra Thali", "Organic", "Bakery & Sweets", "Fast Food"].map((tag) => {
                        const isSelected = formData.cuisineTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              const updated = isSelected 
                                ? formData.cuisineTags.filter(t => t !== tag)
                                : [...formData.cuisineTags, tag];
                              setFormData({ ...formData, cuisineTags: updated });
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                              isSelected
                                ? "bg-[#0F766E] text-white"
                                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Location */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-900 block">
                      Khammam Service Corridor (Locality) <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-3xs text-neutral-500">
                      Our shared delivery algorithm groups batches along these defined geographic corridors.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        "Wyra Road",
                        "Mamata Hospital Road",
                        "Gandhi Chowk",
                        "Bypass Road",
                        "NSP Colony",
                        "Station Road",
                        "Rotary Nagar",
                        "Yellandu Road"
                      ].map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setFormData({ ...formData, locality: loc })}
                          className={`p-3 rounded-xl text-xs font-bold border transition-all text-left ${
                            formData.locality === loc
                              ? "bg-[#0F766E] text-white border-[#0F766E]"
                              : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-900 block">
                      Complete Physical Address <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Shop No, Building Name, Street / Lane"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">Prominent Landmark</label>
                      <input
                        type="text"
                        placeholder="Opposite Andhra Bank"
                        value={formData.landmark}
                        onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">Postal Pincode</label>
                      <input
                        type="text"
                        placeholder="507001"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">GPS Coordinates</label>
                      <input
                        type="text"
                        readOnly
                        value={`${formData.latitude}, ${formData.longitude}`}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs font-mono text-neutral-600 min-h-[44px]"
                      />
                    </div>
                  </div>

                  {/* Interactive Map Picker */}
                  <div className="space-y-2 pt-2 border-t border-neutral-100">
                    <label className="text-xs font-bold text-neutral-900 block">
                      Pinpoint Exact Storefront Location on Map
                    </label>
                    <p className="text-3xs text-neutral-500">
                      Drag the marker to your store entrance or click anywhere within the Khammam delivery zone. Riders navigate directly to this coordinate for order pickups.
                    </p>
                    <LocationPickerMap
                      initialLat={formData.latitude}
                      initialLng={formData.longitude}
                      onLocationSelect={(lat, lng, hint) => {
                        setFormData((prev) => ({
                          ...prev,
                          latitude: Number(lat.toFixed(6)),
                          longitude: Number(lng.toFixed(6)),
                          ...(hint && !prev.landmark ? { landmark: hint } : {}),
                        }));
                      }}
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: Photos */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-900 block">
                      Storefront Photographs & Brand Logo
                    </label>
                    <p className="text-3xs text-neutral-500">
                      Upload actual pictures of your shop exterior, counter, and kitchen. Customers prefer genuine storefront photos. Compressed to WebP automatically.
                    </p>
                    <ImageUploader
                      onboarding={true}
                      value={formData.galleryUrls}
                      onChange={(urls) => {
                        const urlList = Array.isArray(urls) ? urls : [urls];
                        setFormData({ 
                          ...formData, 
                          galleryUrls: urlList,
                          coverUrl: urlList[0] || "",
                          logoUrl: urlList[1] || urlList[0] || ""
                        });
                      }}
                      multiple
                      maxImages={6}
                    />
                  </div>
                </div>
              )}

              {/* STEP 5: Operating Hours */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">
                        Morning Opening Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.openTime}
                        onChange={(e) => setFormData({ ...formData, openTime: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">
                        Night Closing Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.closeTime}
                        onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">
                        Weekly Closed Day
                      </label>
                      <select
                        value={formData.closedDay}
                        onChange={(e) => setFormData({ ...formData, closedDay: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[44px]"
                      >
                        <option value="None">Open All 7 Days (No Weekly Off)</option>
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: Kitchen / Capacity */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-900 block">
                      Standard Food / Order Preparation SLA <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-3xs text-neutral-500">
                      Shared delivery riders will be dispatched to match this prep window. Under-promising and delivering fast maintains high store ratings.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[15, 20, 30, 45].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setFormData({ ...formData, preparationTimeMinutes: mins })}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            formData.preparationTimeMinutes === mins
                              ? "bg-[#0F766E] text-white border-[#0F766E]"
                              : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                          }`}
                        >
                          <span className="text-base font-black block">{mins} mins</span>
                          <span className="text-3xs opacity-80">Prep & Handover</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">Packaging Standard</label>
                      <select
                        value={formData.packagingType}
                        onChange={(e) => setFormData({ ...formData, packagingType: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] bg-white min-h-[44px]"
                      >
                        <option value="THERMAL_INSULATED">Thermal / Aluminium Sealed Pouch</option>
                        <option value="CORRUGATED_BOX">Rigid Corrugated Box</option>
                        <option value="STANDARD_POUCH">Standard Food Pouch</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">Simultaneous Order Peak Capacity</label>
                      <input
                        type="number"
                        value={formData.orderCapacityPerHour}
                        onChange={(e) => setFormData({ ...formData, orderCapacityPerHour: parseInt(e.target.value) || 20 })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 7: Starter Menu */}
              {currentStep === 7 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">Add 1 to 3 Signature Products</h4>
                      <p className="text-3xs text-neutral-500">Your store will go live with these initial items. You can add more later in catalogue.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        starterProducts: [...formData.starterProducts, { name: "", price: "100", unit: "piece", description: "" }]
                      })}
                      className="px-3 py-1.5 rounded-lg bg-teal-50 text-[#0F766E] text-xs font-bold border border-teal-200 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.starterProducts.map((p, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-3xs font-extrabold uppercase text-neutral-500">Item #{idx + 1}</span>
                          {formData.starterProducts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                starterProducts: formData.starterProducts.filter((_, i) => i !== idx)
                              })}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-3xs font-bold text-neutral-700">Item Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Special Andhra Meals"
                              value={p.name}
                              onChange={(e) => {
                                const copy = [...formData.starterProducts];
                                copy[idx].name = e.target.value;
                                setFormData({ ...formData, starterProducts: copy });
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-3xs font-bold text-neutral-700">Price (₹)</label>
                            <input
                              type="number"
                              placeholder="180"
                              value={p.price}
                              onChange={(e) => {
                                const copy = [...formData.starterProducts];
                                copy[idx].price = e.target.value;
                                setFormData({ ...formData, starterProducts: copy });
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-3xs font-bold text-neutral-700">Unit</label>
                            <select
                              value={p.unit}
                              onChange={(e) => {
                                const copy = [...formData.starterProducts];
                                copy[idx].unit = e.target.value;
                                setFormData({ ...formData, starterProducts: copy });
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white"
                            >
                              <option value="plate">Plate</option>
                              <option value="piece">Piece</option>
                              <option value="kg">Kilogram</option>
                              <option value="packet">Packet</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 8: Bank Account */}
              {currentStep === 8 && (
                <div className="space-y-5">
                  <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-[#0F766E]">
                    NationX settles verified merchant balances directly into this bank account daily via automated NEFT / IMPS.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">Bank Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="Name as registered with bank"
                        value={formData.bankAccountHolder}
                        onChange={(e) => setFormData({ ...formData, bankAccountHolder: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">Bank Account Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 50100492819281"
                        value={formData.bankAccountNumber}
                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="SBIN0000854"
                        value={formData.bankIfscCode}
                        onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs font-mono focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">Bank & Branch</label>
                      <input
                        type="text"
                        placeholder="State Bank of India, Khammam"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">Instant Settlement UPI ID</label>
                      <input
                        type="text"
                        placeholder="merchant@sbi"
                        value={formData.payoutUpiId}
                        onChange={(e) => setFormData({ ...formData, payoutUpiId: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 9: KYC */}
              {currentStep === 9 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">
                        FSSAI License / Registration No.
                      </label>
                      <input
                        type="text"
                        placeholder="14-digit FSSAI number"
                        value={formData.fssaiNumber}
                        onChange={(e) => setFormData({ ...formData, fssaiNumber: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs font-mono focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">
                        GSTIN (Tax Identification)
                      </label>
                      <input
                        type="text"
                        placeholder="36AABCK1234F1Z8"
                        value={formData.gstin}
                        onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs font-mono focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-900 block">
                        Business PAN
                      </label>
                      <input
                        type="text"
                        placeholder="AABCK1234F"
                        value={formData.panNumber}
                        onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs font-mono focus:ring-2 focus:ring-[#0F766E] min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 10: Final Review */}
              {currentStep === 10 && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-[#0F766E]">
                    Here is a live preview of how your storefront card will appear to Khammam customers upon administrative approval:
                  </div>

                  {/* Customer Storefront Card Preview */}
                  <div className="max-w-md mx-auto bg-white rounded-2xl border border-neutral-200 shadow-md overflow-hidden">
                    {formData.coverUrl ? (
                      <div className="w-full h-32 bg-neutral-100 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={formData.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full h-20 bg-gradient-to-r from-teal-600 to-teal-800" />
                    )}

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 -mt-9 mb-2">
                        <div className="w-14 h-14 rounded-xl bg-white border border-teal-200 text-[#0F766E] flex items-center justify-center font-bold text-xl shadow-xs overflow-hidden">
                          {formData.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Store className="w-7 h-7" />
                          )}
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-3xs font-extrabold uppercase">
                          Open for Orders
                        </span>
                      </div>

                      <h3 className="text-base font-black text-neutral-950">{formData.shopName || "Your Shop Name"}</h3>
                      <p className="text-xs text-neutral-500 mt-0.5">{formData.address || "Khammam"}</p>

                      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
                        <span className="font-bold text-teal-800">{formData.locality}</span>
                        <span className="flex items-center gap-1 text-3xs">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          {formData.preparationTimeMinutes} mins prep
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Declaration */}
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                    <label className="flex items-start gap-2.5 text-xs text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.agreeToTerms}
                        onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                        className="mt-0.5 w-4 h-4 rounded text-[#0F766E] focus:ring-[#0F766E]"
                      />
                      <span>
                        I declare that the information provided for <strong>{formData.shopName || "this outlet"}</strong> is true and authentic. I agree to adhere to NationX shared delivery SLAs, physical handover procedures, and merchant code of conduct.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="pt-6 border-t border-neutral-100 flex items-center justify-between gap-4">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-5 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[44px]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 10 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[44px]"
                  >
                    <span>Continue to Step {currentStep + 1}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting || !formData.agreeToTerms || !formData.shopName}
                    className="px-8 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold transition-colors flex items-center gap-2 min-h-[48px] disabled:opacity-50 shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? "Submitting Application..." : "Submit Application for Approval"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
