/**
 * File Name: route.ts
 * Description: On-demand ISR revalidation endpoint — called by WordPress save_post hook.
 *
 * Usage (WordPress wp-config.php):
 *   define( 'MMF_NEXTJS_URL', 'https://your-site.com' );
 *   define( 'MMF_NEXTJS_REVALIDATION_SECRET', 'long-random-secret' );
 *
 * Usage (.env / hosting env vars):
 *   REVALIDATION_SECRET=long-random-secret  (same value as wp-config constant)
 *
 * Request: POST /api/revalidate?tag=<tag>&path=<path>
 *   Secret via "x-revalidate-secret" header (preferred), or legacy
 *   ?secret=<token> query param for back-compat.
 *   tag  — Next.js cache tag to purge (e.g. "home-page")
 *   path — route path to purge (e.g. "/")
 *   At least one of tag or path is required.
 */

import { timingSafeEqual } from "node:crypto";

import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Constant-time secret comparison — avoids timing-based secret discovery. */
function isValidSecret(provided: string | null, expected: string): boolean {
  if (!provided) {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  // timingSafeEqual throws on length mismatch — guard first. Length itself
  // leaks nothing useful for a long random secret.
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function POST(request: NextRequest) {
  const secret =
    request.headers.get("x-revalidate-secret") ??
    request.nextUrl.searchParams.get("secret");
  const expected = process.env.REVALIDATION_SECRET;

  if (!expected || !isValidSecret(secret, expected)) {
    return NextResponse.json({ message: "Invalid or missing secret." }, { status: 401 });
  }

  const tag = request.nextUrl.searchParams.get("tag") ?? undefined;
  const path = request.nextUrl.searchParams.get("path") ?? undefined;

  if (!tag && !path) {
    return NextResponse.json({ message: "Provide at least one of: tag, path." }, { status: 400 });
  }

  if (tag) {
    // expire: 0 — purge immediately so the next request refetches from WP.
    revalidateTag(tag, { expire: 0 });
  }

  if (path) {
    revalidatePath(path);
  }

  return NextResponse.json({ revalidated: true, tag: tag ?? null, path: path ?? null });
}
