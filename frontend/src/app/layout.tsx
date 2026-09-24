import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { WalletProviders } from "@/components/locate/WalletProviders";

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const display = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "LOCATE — Lend out your PreStocks. Short the premium.",
  description:
    "LOCATE is the PreStocks token-lending & short-supply rail. Holders lend idle PreStocks for an upfront fee; traders borrow the token against USDC collateral, sell it short, and return it at maturity. Settled by time, delivery, and USDC — no oracles, no liquidation engines.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230A0A0A' stroke='%23232326' stroke-width='1'/%3E%3Ccircle cx='16' cy='16' r='8' fill='none' stroke='%230044FF' stroke-width='2'/%3E%3Cpath d='M16 3v5M16 24v5M3 16h5M24 16h5' stroke='%230044FF' stroke-width='2' stroke-linecap='round'/%3E%3Ccircle cx='16' cy='16' r='2.4' fill='%234D7CFF'/%3E%3C/svg%3E",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sans.variable} ${display.variable} ${mono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <WalletProviders>{children}</WalletProviders>
        <Toaster />
      </body>
    </html>
  );
}
