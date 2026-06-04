import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MilkWise — Bottle Feeding Tracker",
  description: "Precision bottle-feeding tracker for formula and expressed milk. Know your baby is feeding enough — in real time.",
  manifest: "/manifest.json",
  openGraph: {
    title: "MilkWise — Bottle Feeding Tracker",
    description: "Precision bottle-feeding tracker for formula and expressed milk. Know your baby is feeding enough — in real time.",
    url: "https://idea.tail2d60.ts.net",
    siteName: "MilkWise",
    type: "website",
    images: [{
      url: "https://idea.tail2d60.ts.net/og-image.png",
      width: 1200,
      height: 630,
      alt: "MilkWise — Bottle Feeding Tracker",
    }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.className} bg-slate-900 text-slate-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
