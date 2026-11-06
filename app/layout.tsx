import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nasdaq Sinyal Radarı · %20+ hareket ve haber analizi",
  description:
    "Nasdaq hisselerini tarar, haber duyarlılığını analiz eder ve %20 ve üzeri artışları sinyal ve grafikle sunar.",
};

export const viewport: Viewport = {
  themeColor: "#06080b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
