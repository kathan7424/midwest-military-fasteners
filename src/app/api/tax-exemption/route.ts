/**
 * File Name: route.ts
 * Description: Proxy for sales tax exemption certificate API.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { ENV } from "@/config/env";
import { buildWpCookieHeader } from "@/utils/auth-proxy.utils";

async function get_cookie_header(): Promise<string | null> {
  const cookie_store = await cookies();
  const cookie_header = cookie_store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  return cookie_header || null;
}

export const dynamic = "force-dynamic";

// Reject uploads over 10 MB before parsing the form data.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function GET() {
  try {
    const response = await fetch(`${ENV.WP_SITE_URL}/wp-json/custom/v1/tax-exemption`, {
      method: "GET",
      headers: buildWpCookieHeader(await get_cookie_header()),
      cache: "no-store",
    });

    const data = await response.json();
    const res = NextResponse.json(data, { status: response.status });
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (error) {
    console.error("Tax exemption GET proxy error:", error);
    return NextResponse.json(
      { message: "Tax exemption fetch failed." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const content_length = Number(request.headers.get("content-length"));

    if (Number.isFinite(content_length) && content_length > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ message: "File too large." }, { status: 413 });
    }

    const form_data = await request.formData();

    const response = await fetch(`${ENV.WP_SITE_URL}/wp-json/custom/v1/tax-exemption`, {
      method: "POST",
      headers: buildWpCookieHeader(await get_cookie_header()),
      body: form_data,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Tax exemption POST proxy error:", error);
    return NextResponse.json(
      { message: "Tax exemption submission failed." },
      { status: 500 }
    );
  }
}
