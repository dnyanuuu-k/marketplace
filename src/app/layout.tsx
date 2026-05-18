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
  title: "Digital Marketplace",
  description: "A modern digital marketplace platform built with Next.js, Tailwind CSS, and shadcn/ui.",
  keywords: ["marketplace", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "React"],
  authors: [{ name: "Marketplace Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Digital Marketplace",
    description: "A modern digital marketplace platform",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Digital Marketplace",
    description: "A modern digital marketplace platform",
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
