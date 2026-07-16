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
import { fetchSiteSettings } from "@/services/site-settings.service";

// const openSans = Open_Sans({
//   variable: "--font-sans",
//   subsets: ["latin"],
//   weight: ["400", "600", "700", "800"],   /* Regular, SemiBold, Bold, ExtraBold */
//   display: "swap",
// });

const DEFAULT_TITLE = "Midwest Military Fasteners";
const DEFAULT_DESCRIPTION =
  "Genuine, certified fasteners for your demanding needs.";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await fetchSiteSettings();
    const { branding } = settings;
    const faviconUrl = branding.favicon?.url;

    return {
      title: branding.site_title || DEFAULT_TITLE,
      description: branding.tagline || DEFAULT_DESCRIPTION,
      ...(faviconUrl && {
        icons: {
          icon: faviconUrl,
          shortcut: faviconUrl,
          apple: faviconUrl,
        },
      }),
    };
  } catch (error) {
    console.error("Site metadata fetch failed:", error);

    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
    };
  }
}

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
      <body className={`antialiased flex min-h-screen flex-col`}>
        {children}
      </body>
    </html>
  );
}