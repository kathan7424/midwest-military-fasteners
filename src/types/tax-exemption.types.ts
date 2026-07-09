/**
 * File Name: tax-exemption.types.ts
 * Description: Sales tax exemption API types (user certificate — not product cert).
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

export type TaxExemptionNoticeType =
  | "none"
  | "pending"
  | "rejected"
  | "expiring"
  | "expired"
  | "missing";

export interface TaxExemptionStatus {
  status: string;
  expiry_date: string;
  certificate_url: string;
  submitted_at?: string;
  has_certificate?: boolean;
  is_tax_exempt: boolean;
  notice_type: TaxExemptionNoticeType;
  message: string;
  show_notice: boolean;
}
