// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DTC Analytics Maturity Assessment | MaxMin",
  description: "A 4–5 minute assessment that outputs a personalized analytics roadmap.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-bg text-text antialiased">
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
