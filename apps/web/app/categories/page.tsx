"use client";

import React from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  ArrowRight, 
  Sparkles, 
  Store, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";

export default function CategoriesPage() {
  const categoryGroups = [
    {
      id: "restaurants",
      title: "Hot Kitchens & Regional Biryani",
      icon: "🍛",
      description: "Authentic Hyderabadi & Telangana dum biryani, curries, and tiffin from trusted local restaurants.",
      popularItems: ["Chicken Dum Biryani", "Mutton Biryani", "Paneer Butter Masala", "Ghee Karam Dosa"],
      merchantsCount: "4 Verified Outlets",
      accent: "from-amber-500/10 to-transparent",
      categoryParam: "Restaurants"
    },
    {
      id: "groceries",
      title: "Kirana, Grains & Daily Staples",
      icon: "🌾",
      description: "Sona Masoori rice, pulses, cold-pressed oils, spices, and packaged food essentials.",
      popularItems: ["Sona Masoori Rice (25kg)", "Toor Dal Premium", "Freedom Sunflower Oil", "Aashirvaad Atta"],
      merchantsCount: "6 Verified Stores",
      accent: "from-emerald-500/10 to-transparent",
      categoryParam: "Groceries"
    },
    {
      id: "dairy",
      title: "Daily Dairy, Milk & Bakery",
      icon: "🥛",
      description: "Fresh Vijaya/Heritage milk, curd, paneer, and freshly baked bread and rusks.",
      popularItems: ["Fresh Full Cream Milk (500ml)", "Curd Pouch", "Fresh Malai Paneer", "Brown Bread"],
      merchantsCount: "3 Verified Hubs",
      accent: "from-blue-500/10 to-transparent",
      categoryParam: "Dairy"
    },
    {
      id: "produce",
      title: "Fresh Farm Fruits & Vegetables",
      icon: "🥬",
      description: "Locally harvested vegetables, seasonal fruits, and greens sourced daily from Khammam rythu bazars.",
      popularItems: ["Country Tomatoes (1kg)", "Desi Potatoes (1kg)", "Fresh Palak Bunch", "Robusta Bananas"],
      merchantsCount: "5 Verified Stalls",
      accent: "from-green-500/10 to-transparent",
      categoryParam: "Produce"
    },
    {
      id: "pharmacy",
      title: "Pharmacy, Wellness & First Aid",
      icon: "💊",
      description: "Over-the-counter medicines, baby care products, health supplements, and first-aid kits.",
      popularItems: ["Paracetamol 650mg", "ORS Electrolyte Drink", "Dettol Antiseptic", "Digital Thermometer"],
      merchantsCount: "2 Licensed Chemists",
      accent: "from-rose-500/10 to-transparent",
      categoryParam: "Pharmacy"
    },
    {
      id: "sweets",
      title: "Traditional Sweets & Snacks",
      icon: "🍬",
      description: "Famous Telangana sweets, hot mixtures, bellam gavvalu, and festive gift boxes.",
      popularItems: ["Kaju Katli (250g)", "Bellam Sunnundalu", "Khammam Mixture (500g)", "Gulab Jamun"],
      merchantsCount: "3 Specialty Sweet Houses",
      accent: "from-purple-500/10 to-transparent",
      categoryParam: "Sweets"
    }
  ];

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Title Header */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#0F766E] block">
            Khammam Retail Catalog
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-950 tracking-tight">
            Browse by Local Category
          </h1>
          <p className="text-neutral-600 text-sm max-w-2xl leading-relaxed">
            Everything you need from your neighbourhood, organized into verified categories. Remember: you can combine items across categories into a single delivery batch.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryGroups.map((group) => (
            <div
              key={group.id}
              className={`p-6 rounded-3xl bg-white border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between bg-gradient-to-br ${group.accent}`}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl p-2 rounded-2xl bg-white shadow-2xs border border-neutral-100">
                    {group.icon}
                  </span>
                  <span className="text-3xs font-extrabold uppercase px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F766E]">
                    {group.merchantsCount}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-neutral-900 mb-2">
                  {group.title}
                </h2>
                <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                  {group.description}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                  <span className="text-3xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    Frequent staples:
                  </span>
                  {group.popularItems.map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-xs text-neutral-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100">
                <Link
                  href={`/explore?category=${encodeURIComponent(group.categoryParam)}`}
                  className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-[#0F766E] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <span>Explore {group.categoryParam} Stores</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
