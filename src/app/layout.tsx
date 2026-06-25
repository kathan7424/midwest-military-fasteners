/**
 * File Name: layout.tsx
 * Description: Root layout — loads Open Sans font and global styles
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-24
 */

import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";

import "@/app/globals.css";

const openSans = Open_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],   /* Regular, SemiBold, Bold, ExtraBold */
  display: "swap",
});

export const metadata: Metadata = {
  title: "Midwest Military Fasteners",
  description: "Genuine, certified fasteners for your demanding needs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${openSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
