/**
 * File Name: AnalyticsScripts.tsx
 * Description: GTM + GA4 loaders, IDs sourced from WP (Settings → SEO &
 *              Analytics) — never hardcoded. Uses next/script per Next.js's
 *              own documented GTM integration pattern (afterInteractive),
 *              not raw <script> tags in <head>.
 * Developer: KP-184
 * Created Date: 2026-07-21
 */

import Script from "next/script";

interface AnalyticsScriptsProps {
  gtmId?: string;
  ga4Id?: string;
}

export default function AnalyticsScripts({
  gtmId,
  ga4Id,
}: AnalyticsScriptsProps) {
  return (
    <>
      {gtmId ? (
        <Script id="gtm-loader" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      ) : null}

      {ga4Id ? (
        <>
          <Script
            id="ga4-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
          />
          <Script id="ga4-config" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ga4Id}');`}
          </Script>
        </>
      ) : null}
    </>
  );
}

/**
 * GTM noscript fallback — must render immediately after <body>'s opening
 * tag (Google's own required placement) so tags still fire with JS disabled.
 */
export function GtmNoScriptFallback({ gtmId }: { gtmId?: string }) {
  if (!gtmId) {
    return null;
  }

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
