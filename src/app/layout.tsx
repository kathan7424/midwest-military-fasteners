/**
 * File Name: layout.tsx
 * Description: Root layout — loads Open Sans font and global styles
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-21
 */

import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { fetchSiteSettings } from "@/services/site-settings.service";
import LayoutWrapper from "@/components/layout/DynamicHeight/LayoutWrapper";
import AnalyticsScripts, {
  GtmNoScriptFallback,
} from "@/components/shared_Ui/AnalyticsScripts";

const DEFAULT_TITLE = "Midwest Military Fasteners";
const DEFAULT_DESCRIPTION =
  "Genuine, certified fasteners for your demanding needs.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#CC9900",
};

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Deduped with the generateMetadata() call above (react cache()) — no
  // extra network round trip, just reads the same per-request result.
  const settings = await fetchSiteSettings().catch(() => null);
  const gtmId = settings?.seoAnalytics?.gtm_id;
  const ga4Id = settings?.seoAnalytics?.ga4_id;

  return (
    <html lang="en" className={``} >
      <head>
        {/* Adobe Fonts (Typekit) is a licensed CDN stylesheet, not a local
            font — can't move to next/font/local without the actual font
            files + self-hosting permission on the Adobe plan. Preconnect is
            the safe, license-neutral mitigation Next.js recommends for
            third-party font services that can't be self-hosted. */}
        <link rel="preconnect" href="https://use.typekit.net" />
        <link rel="stylesheet" href="https://use.typekit.net/bzs4pmx.css" />
        <AnalyticsScripts gtmId={gtmId} ga4Id={ga4Id} />
      </head>
      <body className={`antialiased`}>
       <GtmNoScriptFallback gtmId={gtmId} />
       <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}