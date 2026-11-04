"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw, XCircle, Clock, ShieldCheck } from "lucide-react";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function AdminExceptionsPage() {
  const [exceptions, setExceptions] = useState([
    {
      id: "exc-1",
      stopId: "stop-khm-03",
      batchId: "bat-khm-01",
      reason: "CUSTOMER_UNREACHABLE",
      notes: "Called customer twice outside Mamata Hospital gate, no response after 8 mins.",
      createdAt: new Date().toISOString(),
      status: "OPEN",
    },
    {
      id: "exc-2",
      stopId: "stop-khm-04",
      batchId: "bat-khm-02",
      reason: "GATE_LOCKED",
      notes: "Bank colony main gate locked for afternoon hours.",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      status: "RESOLVED",
    }
  ]);

  const [resolvedMsg, setResolvedMsg] = useState<string | null>(null);

  const handleResolve = (id: string) => {
    setExceptions(exceptions.map(e => e.id === id ? { ...e, status: "RESOLVED" } : e));
    setResolvedMsg(`Exception ${id} resolved. Partner instructed to complete redelivery.`);
    setTimeout(() => setResolvedMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
          Exceptions & Operational Escalations
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600">
          Supervise transit anomalies, failed customer handovers, and locked premises in Khammam.
        </p>
      </div>

      {resolvedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{resolvedMsg}</span>
        </div>
      )}

      <div className="space-y-4">
        {exceptions.map((exc) => (
          <div
            key={exc.id}
            className={`p-6 rounded-2xl border transition-all space-y-4 ${
              exc.status === "OPEN"
                ? "bg-white border-amber-300 shadow-2xs"
                : "bg-neutral-50 border-neutral-200 opacity-75"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  exc.status === "OPEN" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-black text-neutral-900 block">{exc.reason.replace(/_/g, " ")}</span>
                  <span className="text-3xs text-neutral-400">
                    Stop #{exc.stopId} · Batch #{exc.batchId} · Logged {new Date(exc.createdAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </span>
                </div>
              </div>

              <span className={`px-2.5 py-0.5 rounded text-3xs font-extrabold uppercase ${
                exc.status === "OPEN" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}>
                {exc.status}
              </span>
            </div>

            <p className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              {exc.notes}
            </p>

            {exc.status === "OPEN" && (
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={() => handleResolve(exc.id)}
                  className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D625C] text-white text-xs font-bold min-h-[40px] flex items-center gap-1.5 shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Mark Resolved & Instruct Redelivery</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

