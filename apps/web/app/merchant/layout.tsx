"use client";

import React from "react";
import { MerchantLayout } from "@/components/layouts/merchant-layout";

export default function MerchantPortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MerchantLayout>{children}</MerchantLayout>;
}
