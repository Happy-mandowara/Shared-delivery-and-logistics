import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "NationX Shared Delivery & Logistics",
  description: "Intelligent Shared Delivery Fulfilment Engine — Khammam Pilot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased font-sans bg-[#F8FAFA] text-[#1c1c1a] min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
