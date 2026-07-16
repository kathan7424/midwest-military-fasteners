/**
 * File Name: route.ts
 * Description: Same-origin file download proxy. Product spec sheets and
 *   certificates live on the WordPress origin, so the browser's `download`
 *   attribute can't force a download (cross-origin). This route streams the
 *   file back with Content-Disposition: attachment.
 *   SECURITY: only URLs on the configured WP origin are allowed — this is
 *   NOT an open proxy.
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { ENV } from "@/config/env";

export const dynamic = "force-dynamic";

// svg/zip included: product certificates and spec assets are uploaded in
// these formats too. Served with Content-Disposition: attachment, so an SVG
// can never execute in the page context.
const ALLOWED_EXTENSIONS = /\.(pdf|png|jpe?g|webp|gif|svg|zip|doc|docx|xls|xlsx|csv|txt)$/i;

export async function GET(request: NextRequest) {
  // ?secure=1 — caller asserts this is a post-purchase document that requires
  // an authenticated session. Public spec sheets omit this param.
  if (request.nextUrl.searchParams.get("secure") === "1") {
    const cookie_store = await cookies();
    const isLoggedIn = cookie_store
      .getAll()
      .some((c) => c.name.startsWith("wordpress_logged_in_"));
    if (!isLoggedIn) {
      return Response.json({ message: "Authentication required." }, { status: 401 });
    }
  }

  const rawUrl = request.nextUrl.searchParams.get("url") ?? "";

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return Response.json({ message: "Invalid file URL." }, { status: 400 });
  }

  // Only proxy files hosted on the WordPress site — never arbitrary hosts.
  const wpOrigin = new URL(ENV.WP_SITE_URL).origin;
  if (target.origin !== wpOrigin) {
    return Response.json({ message: "File host not allowed." }, { status: 403 });
  }

  const filename = decodeURIComponent(
    target.pathname.split("/").pop() || "download"
  );

  if (!ALLOWED_EXTENSIONS.test(filename)) {
    return Response.json({ message: "File type not allowed." }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), { cache: "no-store" });

    if (!upstream.ok || !upstream.body) {
      return Response.json({ message: "File not found." }, { status: 404 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/octet-stream",
        // ASCII-sanitized filename + RFC 5987 encoded fallback for the rest.
        "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.\- ]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        ...(upstream.headers.get("content-length")
          ? { "Content-Length": upstream.headers.get("content-length")! }
          : {}),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Download proxy error:", error);
    return Response.json({ message: "Download failed." }, { status: 500 });
  }
}
