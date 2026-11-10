import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Geist, Special_Elite } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const serif = Fraunces({ variable: "--font-serif", subsets: ["latin"] });
const hand = Caveat({ variable: "--font-hand", subsets: ["latin"] });
const stamp = Special_Elite({ variable: "--font-stamp", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Scam Shield: Check before you trust",
  description:
    "Paste or screenshot a suspicious message or describe a suspicious call. Get a clear verdict, the red flags highlighted and exactly what to do next.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe4" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1512" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${hand.variable} ${stamp.variable}`}>
      <body>{children}</body>
    </html>
  );
}
