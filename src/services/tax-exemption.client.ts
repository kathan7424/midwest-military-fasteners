/**
 * File Name: tax-exemption.client.ts
 * Description: Client API for user sales tax exemption certificate.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import type { TaxExemptionStatus } from "@/types/tax-exemption.types";

export async function fetch_tax_exemption_status(): Promise<TaxExemptionStatus> {
  const response = await fetch("/api/tax-exemption", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load tax exemption status.");
  }

  return (await response.json()) as TaxExemptionStatus;
}

export async function upload_tax_exemption_document(
  certificate: File,
  expiry_date: string
): Promise<TaxExemptionStatus & { success?: boolean; message?: string }> {
  const form_data = new FormData();
  form_data.append("certificate", certificate);
  form_data.append("expiry_date", expiry_date);

  const response = await fetch("/api/tax-exemption", {
    method: "POST",
    body: form_data,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Upload failed.");
  }

  return data as TaxExemptionStatus & { success?: boolean; message?: string };
}
