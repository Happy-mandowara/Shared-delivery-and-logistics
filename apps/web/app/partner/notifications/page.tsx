"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Clock, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";

export default function PartnerNotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ["partner-notifications-page"],
    queryFn: async () => {
      const res = await api.get<any>("/notifications");
      return res.data?.notifications || [];
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await api.post("/notifications/read-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-notifications-page"] });
    },
  });

  const notifications = notificationsData || [];
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Dispatch Notifications
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600">
            Real-time batch offers, stop sequence updates, and urgent hub broadcasts.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="px-3.5 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-xs font-bold text-neutral-800 transition-colors min-h-[40px] flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4 text-teal-600" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 rounded-2xl bg-white border border-neutral-200 animate-pulse h-40" />
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-neutral-200 space-y-3">
          <Bell className="w-12 h-12 text-neutral-300 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">No new alerts</h2>
          <p className="text-xs text-neutral-500">Dispatch messages and batch assignments will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden shadow-2xs">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                !n.read ? "bg-teal-50/40" : "hover:bg-neutral-50/60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  !n.read ? "bg-[#0F766E] text-white" : "bg-neutral-100 text-neutral-600"
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 block">{n.title}</span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[#0F766E]" />}
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">{n.message}</p>
                  <span className="text-3xs text-neutral-400 block">
                    {new Date(n.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
