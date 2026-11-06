import type { NextConfig } from "next";

/**
 * GitHub Pages proje sitesi olarak yayinlanir: /HisseBildirimSistemi/
 * Yerel gelistirmede BASE_PATH bos kalir, site kok dizinde calisir.
 */
const basePath = process.env.BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGIN ? [process.env.ALLOWED_DEV_ORIGIN] : [],
};

export default nextConfig;
