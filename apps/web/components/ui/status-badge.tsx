import React from "react";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Package, 
  Truck, 
  XCircle, 
  Check, 
  MapPin, 
  ChefHat
} from "lucide-react";

interface StatusBadgeProps {
  status: string;
  type?: "order" | "suborder" | "batch" | "stop" | "partner" | "assignment";
}

export function StatusBadge({ status, type = "order" }: StatusBadgeProps) {
  // Normalize status string
  const s = status.toUpperCase();

  // Mapping to icon, label, and colors
  let bg = "bg-neutral-100 text-neutral-800 border-neutral-300";
  let Icon = Clock;
  let label = s.replace(/_/g, " ");

  switch (s) {
    case "PENDING":
    case "DRAFT":
    case "PLACED":
    case "OFFERED":
      bg = "bg-amber-50 text-[#92400E] border-amber-300";
      Icon = Clock;
      break;

    case "ACCEPTED":
    case "MERCHANT_CONFIRMED":
      bg = "bg-teal-50 text-[#0F766E] border-teal-300";
      Icon = ChefHat;
      break;

    case "READY_FOR_PICKUP":
      bg = "bg-blue-50 text-blue-800 border-blue-300";
      Icon = Package;
      label = "Ready for Pickup";
      break;

    case "ASSIGNED":
    case "PARTNER_ASSIGNED":
      bg = "bg-indigo-50 text-indigo-800 border-indigo-300";
      Icon = Truck;
      label = "Partner Assigned";
      break;

    case "PICKED_UP":
    case "IN_TRANSIT":
    case "DISPATCHED":
      bg = "bg-sky-50 text-sky-800 border-sky-300";
      Icon = Truck;
      label = s === "PICKED_UP" ? "Picked Up" : "In Transit";
      break;

    case "ARRIVED":
      bg = "bg-cyan-50 text-cyan-800 border-cyan-300";
      Icon = MapPin;
      label = "Arrived at Stop";
      break;

    case "DELIVERED":
    case "COMPLETED":
    case "AVAILABLE":
      bg = "bg-emerald-50 text-[#166534] border-emerald-300";
      Icon = CheckCircle2;
      label = s === "AVAILABLE" ? "Available" : "Completed";
      break;

    case "FAILED":
    case "CANCELLED":
    case "REJECTED":
    case "BUSY":
    case "UNAVAILABLE":
      bg = "bg-red-50 text-[#B42318] border-red-300";
      Icon = XCircle;
      break;

    default:
      bg = "bg-neutral-100 text-neutral-700 border-neutral-300";
      Icon = Clock;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bg}`}
      role="status"
      aria-label={`Status: ${label}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

