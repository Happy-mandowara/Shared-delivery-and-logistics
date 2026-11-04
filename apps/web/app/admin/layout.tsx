"use client";

import React from "react";
import { AdminLayout } from "@/components/layouts/admin-layout";

export default function AdminPortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
