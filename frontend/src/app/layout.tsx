import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "../components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JARVIS - AI-Powered Property Analysis",
  description: "Revolutionising dealmaking with cutting-edge property analysis and AI-powered market insights. The future of real estate intelligence.",
  keywords: "property analysis, real estate AI, JARVIS, property valuation, market analysis, real estate technology",
  authors: [{ name: "Exceva Property" }],
  creator: "Exceva Property",
  publisher: "Exceva Property",
  openGraph: {
    title: "JARVIS - AI-Powered Property Analysis",
    description: "Revolutionising dealmaking with cutting-edge property analysis and AI-powered market insights.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JARVIS - AI-Powered Property Analysis",
    description: "Revolutionising dealmaking with cutting-edge property analysis and AI-powered market insights.",
  },
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
