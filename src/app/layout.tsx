/**
 * File Name: layout.tsx
 * Description: Root layout — loads Open Sans font and global styles
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-30
 */

import type { Metadata } from "next";
//import { Open_Sans} from "next/font/google";

import "@/app/globals.css";

// const openSans = Open_Sans({
//   variable: "--font-sans",
//   subsets: ["latin"],
//   weight: ["400", "600", "700", "800"],   /* Regular, SemiBold, Bold, ExtraBold */
//   display: "swap",
// });

export const metadata: Metadata = {
  title: "Midwest Military Fasteners",
  description: "Genuine, certified fasteners for your demanding needs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={``} >
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/bzs4pmx.css" />
      </head>
      <body className={`antialiased`}>
        {children}
      </body>
    </html>
  );
}