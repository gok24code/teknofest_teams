import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: { default: "TTS · Teknofest Takım Takip Sistemi", template: "%s · TTS" },
  description: "ISUBÜ Teknofest takımlarının üye, görev ve haftalık ilerleme takip sistemi.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0a1a33" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
