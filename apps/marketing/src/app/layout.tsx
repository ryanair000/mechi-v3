import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getAppUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: "Mechi Marketing Dashboard",
  description:
    "Internal campaign dashboard for managing the 30-day Mechi tournament marketing push.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0E1626",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" data-theme="dark" style={{ colorScheme: "dark" }}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
