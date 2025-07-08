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
  title: "Exceva Property Management System",
  description: "Complete property portfolio management solution for landlords, property managers, and real estate professionals. Manage properties, tenants, leases, and finances all in one place.",
  keywords: "property management, real estate, portfolio management, tenant management, lease management, property finance, rental management",
  authors: [{ name: "Exceva Property" }],
  creator: "Exceva Property",
  publisher: "Exceva Property",
  openGraph: {
    title: "Exceva Property Management System",
    description: "Complete property portfolio management solution for landlords, property managers, and real estate professionals.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Exceva Property Management System",
    description: "Complete property portfolio management solution for landlords, property managers, and real estate professionals.",
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
