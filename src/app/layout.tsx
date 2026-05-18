import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Albostech Market",
  description:
    "Discover and purchase premium digital products — HRMS, Garage Management, and enterprise software from verified Albos Technology creators.",
  keywords: [
    "Albostech",
    "marketplace",
    "HRMS",
    "garage management",
    "enterprise software",
    "Albos Technology",
  ],
  authors: [{ name: "Albos Technology" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Albostech Market",
    description: "Premium digital products from Albos Technology",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Albostech Market",
    description: "Premium digital products from Albos Technology",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-background text-foreground`}>
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
