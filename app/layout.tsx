import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://bynomo.fun'),
  title: "BYNOMO — On-Chain Binary Options",
  description:
    "The first on-chain binary options trading dapp. Trade on BNB, SOL, SUI, XLM, XTZ, NEAR. Powered by Pyth Hermes price attestations, Supabase, and x402-style payments. Oracle-bound resolution, minimal trust.",
  keywords: [
    "binary options",
    "crypto trading",
    "Pyth oracle",
    "BNB",
    "Solana",
    "Sui",
    "Stellar",
    "Tezos",
    "NEAR",
    "Web3",
    "prediction",
  ],
  icons: {
    icon: "/overflowlogo.ico",
    shortcut: "/overflowlogo.ico",
    apple: "/overflowlogo.ico",
  },
  openGraph: {
    title: "BYNOMO — On-Chain Binary Options",
    description:
      "Trade binary options with oracle-bound resolution and minimal trust. Real-time Pyth oracles, 5s–1m rounds, 300+ assets. BNB, SOL, SUI, XLM, XTZ, NEAR.",
    images: [{ url: '/images/marketing/image.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "BYNOMO — On-Chain Binary Options",
    description: "Trade binary options with oracle-bound resolution and minimal trust.",
    images: ['/images/marketing/image.png'],
  },
};

import { Header } from "@/components/Header";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} antialiased bg-[#02040a] text-white h-screen overflow-hidden flex flex-col`}
      >
        <Providers>
          <Header />
          <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
