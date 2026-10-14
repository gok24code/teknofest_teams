import type { NextConfig } from "next";

const securityHeaders = [
  // Sayfanın başka sitelerde iframe içinde açılmasını engelle (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@aws-sdk/client-s3"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Kişisel veri içeren sayfaların tarayıcı/proxy önbelleğinde tutulmaması için
      { source: "/(admin|kaptan)/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
