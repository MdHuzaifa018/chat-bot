import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BrowserStorageCleanup } from "./BrowserStorageCleanup";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SupportAI | Client & Admin Platform",
  description: "Enterprise AI Client Support Chatbot SaaS platform powered by Google Gemini and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-[#F1F7EF] text-[#202820] antialiased`}
        suppressHydrationWarning
      >
        <BrowserStorageCleanup />
        {children}
      </body>
    </html>
  );
}
