import React from "react";
import { CheckCircle2, Clock, AlertTriangle, Package, Truck, ArrowRight, UserCheck } from "lucide-react";

export interface TimelineEvent {
  status: string;
  label: string;
  timestamp?: string | null;
  actor?: string | null;
  description?: string | null;
  exceptionReason?: string | null;
  isCompleted: boolean;
  isCurrent: boolean;
}

interface TimelineViewProps {
  events: TimelineEvent[];
  className?: string;
}

export function TimelineView({ events, className = "" }: TimelineViewProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-500 text-sm">
        No lifecycle events recorded yet.
      </div>
    );
  }

  return (
    <div className={`relative pl-6 space-y-6 ${className}`}>
      {/* Vertical Track Line */}
      <div
        className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-neutral-200"
        aria-hidden="true"
      />

      {events.map((ev, idx) => {
        let iconBg = "bg-neutral-100 text-neutral-400 border-neutral-300";
        if (ev.isCompleted) {
          iconBg = "bg-emerald-600 text-white border-emerald-600";
        } else if (ev.isCurrent) {
          iconBg = "bg-[#0F766E] text-white border-[#0F766E] ring-4 ring-teal-100";
        } else if (ev.exceptionReason) {
          iconBg = "bg-red-600 text-white border-red-600 ring-4 ring-red-100";
        }

        return (
          <div key={idx} className="relative flex items-start gap-4">
            {/* Step Icon Indicator */}
            <div
              className={`absolute -left-6 mt-0.5 flex items-center justify-center w-6 h-6 rounded-full border text-xs transition-colors shrink-0 ${iconBg}`}
              aria-hidden="true"
            >
              {ev.isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : ev.exceptionReason ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : ev.isCurrent ? (
                <Clock className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-neutral-300" />
              )}
            </div>

            {/* Event Content */}
            <div className="flex-1 bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`text-sm font-semibold ${
                    ev.isCurrent
                      ? "text-[#0F766E]"
                      : ev.exceptionReason
                      ? "text-red-700"
                      : "text-neutral-900"
                  }`}
                >
                  {ev.label}
                </span>
                {ev.timestamp && (
                  <span className="text-xs text-neutral-500 font-mono">
                    {new Date(ev.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>

              {ev.description && (
                <p className="text-xs text-neutral-600 mt-1">{ev.description}</p>
              )}

              {ev.actor && (
                <div className="mt-2 text-2xs font-medium text-neutral-500 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-neutral-400" />
                  <span>Actor: {ev.actor}</span>
                </div>
              )}

              {ev.exceptionReason && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-800">
                  <span className="font-bold">Exception Notice:</span> {ev.exceptionReason}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Timeline({
  currentStatus = "PENDING",
  events,
  className = "",
}: {
  currentStatus?: string;
  events?: TimelineEvent[];
  className?: string;
}) {
  if (events && events.length > 0) {
    return <TimelineView events={events} className={className} />;
  }

  // Derive standard milestones from status
  const milestones = [
    { key: "PENDING", label: "Order Created" },
    { key: "ACCEPTED", label: "Merchant Confirmed" },
    { key: "BATCHED", label: "Grouped in Shared Batch" },
    { key: "ASSIGNED", label: "Delivery Partner Assigned" },
    { key: "DISPATCHED", label: "Picked Up & En Route" },
    { key: "IN_TRANSIT", label: "Approaching Destination" },
    { key: "DELIVERED", label: "Delivered (POD Verified)" },
  ];

  const statusOrder = milestones.map((m) => m.key);
  const currentIndex = statusOrder.indexOf(currentStatus);

  const derivedEvents: TimelineEvent[] = milestones.map((m, idx) => {
    const isCompleted = currentIndex > idx || currentStatus === "DELIVERED";
    const isCurrent = currentIndex === idx;
    return {
      status: m.key,
      label: m.label,
      isCompleted,
      isCurrent,
    };
  });

  return <TimelineView events={derivedEvents} className={className} />;
}
