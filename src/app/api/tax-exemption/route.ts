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

export async function GET() {
  const response = await fetch(`${ENV.WP_SITE_URL}/wp-json/custom/v1/tax-exemption`, {
    method: "GET",
    headers: buildWpCookieHeader(await get_cookie_header()),
    cache: "no-store",
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: NextRequest) {
  const form_data = await request.formData();

  const response = await fetch(`${ENV.WP_SITE_URL}/wp-json/custom/v1/tax-exemption`, {
    method: "POST",
    headers: buildWpCookieHeader(await get_cookie_header()),
    body: form_data,
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
