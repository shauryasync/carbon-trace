import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Carbon Trace (Prototype)",
  description: "Unique, tamper-proof, publicly traceable carbon credit records.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen !bg-[#FAFAF7] !text-[#0E1512] antialiased`}>
        <div className="border-b border-[#E4E4DC] bg-[#FBF3DC] px-4 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A6D1D]">
          Prototype · synthetic data · Sepolia testnet only
        </div>
        <Navbar />
        <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}