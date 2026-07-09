/**
 * File Name: tax-exemption.service.ts
 * Description: Server-side sales tax exemption status fetch.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { cookies } from "next/headers";

import { ENV } from "@/config/env";
import type { TaxExemptionStatus } from "@/types/tax-exemption.types";
import { buildWpCookieHeader } from "@/utils/auth-proxy.utils";

export async function fetch_tax_exemption_status_server(): Promise<TaxExemptionStatus | null> {
  const cookie_store = await cookies();
  const cookie_header = cookie_store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  if (!cookie_header) {
    return null;
  }

  try {
    const response = await fetch(`${ENV.WP_SITE_URL}/wp-json/custom/v1/tax-exemption`, {
      method: "GET",
      headers: buildWpCookieHeader(cookie_header),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as TaxExemptionStatus;
  } catch {
    return null;
  }
}
