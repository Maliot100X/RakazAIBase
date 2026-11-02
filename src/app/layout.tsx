import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Anybody, Geist, Geist_Mono, Instrument_Serif, Dela_Gothic_One } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell/app-shell";
import { APP_NAME } from "@/lib/brand";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const anybody = Anybody({ variable: "--font-anybody", subsets: ["latin"], axes: ["wdth"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: "italic" });
const dela = Dela_Gothic_One({ variable: "--font-dela", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: `${APP_NAME} — Rakaza's stage on Base (8453) & Farcaster Mini App`,
  // No fc:miniapp embed / accountAssociation yet — needs real signed manifest (later phase).
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#120828",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${anybody.variable} ${instrument.variable} ${dela.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <Suspense fallback={null}><AppShell>{children}</AppShell></Suspense>
        </Providers>
      </body>
    </html>
  );
}
