"use client";

import React from "react";
import { CustomerLayout } from "@/components/layouts/customer-layout";

export default function CustomerPortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerLayout>{children}</CustomerLayout>;
}
