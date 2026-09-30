import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/use-auth";

const geistSans = Geist({
 variable: "--font-geist-sans",
 subsets: ["latin"],
});

const geistMono = Geist_Mono({
 variable: "--font-geist-mono",
 subsets: ["latin"],
});

export const metadata: Metadata = {
 title: "FoodMitra — Admin & Restaurant Console",
 description: "Production-grade food delivery platform — Admin, Restaurant, and Customer flows.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return (
 <html lang="en">
 <body
 className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
 >
 <AuthProvider>
 {children}
 </AuthProvider>
 <Toaster />
 <SonnerToaster richColors position="top-right" />
 </body>
 </html>
 );
}
