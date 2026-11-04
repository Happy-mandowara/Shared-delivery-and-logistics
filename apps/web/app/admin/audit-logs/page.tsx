"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, ShieldCheck, Clock, Filter, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState("");

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ["admin-audit-events"],
    queryFn: async () => {
      const res = await api.get<any>("/events");
      return res.data?.events || [];
    },
    refetchInterval: 5000,
  });

  const events = eventsData || [];

  const filtered = events.filter((e: any) => {
    const typeStr = e.type || e.event_type || "";
    const msgStr = e.message || "";
    const actorStr = e.actor_name || e.actor_id || "";
    const batchStr = e.batch_code || e.batch_id || "";
    const q = search.toLowerCase();
    return (
      typeStr.toLowerCase().includes(q) ||
      msgStr.toLowerCase().includes(q) ||
      actorStr.toLowerCase().includes(q) ||
      batchStr.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Immutable Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Cryptographically tamper-evident event log (`public.delivery_events`) capturing all state machine transitions.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search event type or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white rounded-xl text-xs font-medium border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#0F766E] min-h-[40px]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <TableRowSkeleton />
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <FileText className="w-12 h-12 text-neutral-300 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">No events found</h2>
          <p className="text-xs text-neutral-500">Every state change and assignment in the system is logged here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden shadow-2xs">
          {filtered.map((ev: any) => (
            <div key={ev.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-50/50 transition-colors">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded">
                    {ev.type || ev.event_type}
                  </span>
                  <span className="text-xs font-bold text-neutral-900">
                    {ev.message || `Entity #${(ev.order_id || ev.suborder_id || ev.batch_id || ev.id)?.slice(0, 8)}`}
                  </span>
                </div>
                <div className="text-3xs text-neutral-500 flex flex-wrap items-center gap-3">
                  <span>
                    Actor: <strong className="text-neutral-700">{ev.actor_name ? `${ev.actor_name} (${ev.actor_role})` : (ev.actor_id?.slice(0, 8) || "System")}</strong>
                  </span>
                  {ev.batch_code && (
                    <span className="bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded font-mono">
                      {ev.batch_code}
                    </span>
                  )}
                  <span>{new Date(ev.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                </div>
              </div>

              {ev.reason && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-3xs font-medium text-amber-900 max-w-xs">
                  Reason: {ev.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

