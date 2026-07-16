/**
 * File Name: tax-exemption.client.ts
 * Description: Client API for user sales tax exemption certificate.
 * Developer: KP-184
 * Created Date: 2026-07-07
 * Last Modified: 2026-07-15
 */

import { apiGet } from "@/utils/api-client";
import { API_ROUTES } from "@/config/routes";
import type { TaxExemptionStatus } from "@/types/tax-exemption.types";

export async function fetch_tax_exemption_status(): Promise<TaxExemptionStatus> {
  const { ok, data } = await apiGet<TaxExemptionStatus>(API_ROUTES.taxExemption, {
    retries: 2,
  });
  if (!ok) throw new Error("Unable to load tax exemption status.");
  return data;
}

export async function upload_tax_exemption_document(
  certificate: File,
  expiry_date: string
): Promise<TaxExemptionStatus & { success?: boolean; message?: string }> {
  const form_data = new FormData();
  form_data.append("certificate", certificate);
  form_data.append("expiry_date", expiry_date);

  // Multipart upload — cannot use apiPost (sets Content-Type: application/json).
  const response = await fetch(API_ROUTES.taxExemption, {
    method: "POST",
    body: form_data,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      (data as { message?: string })?.message || "Upload failed."
    );
  }

  return data as TaxExemptionStatus & { success?: boolean; message?: string };
}
