import type { Metadata, Viewport } from "next";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./base.css";
import "./panels.css";
import "./content.css";
import "./responsive.css";
import "./features.css";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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
    "Nasdaq hisselerini canlı tarar, haber duyarlılığını analiz eder ve %20 ve üzeri artışları anlık bildirim ve grafikle sunar.",
  applicationName: "Nasdaq Sinyal Radarı",
  manifest: `${BASE}/manifest.webmanifest`,
  icons: {
    icon: [{ url: `${BASE}/icon.svg`, type: "image/svg+xml" }],
    apple: [{ url: `${BASE}/icons/icon-192.png`, sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#06080b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${sans.variable} ${mono.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
