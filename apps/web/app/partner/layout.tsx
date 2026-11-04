"use client";

import React from "react";
import { PartnerLayout } from "@/components/layouts/partner-layout";

export default function PartnerPortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PartnerLayout>{children}</PartnerLayout>;
}
