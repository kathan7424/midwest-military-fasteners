/**
 * File Name: CartTaxExemptionNotice.tsx
 * Description: Figma cart/checkout banner for sales tax exemption status.
 *   - pending  → message only (nothing to do but wait for admin approval)
 *   - expiring / expired / rejected / missing → message + inline instant
 *     upload (file + expiry) submitted right from the banner.
 * Developer: KP-184
 * Created Date: 2026-07-07
 * Last Modified: 2026-07-08
 */

"use client";

import { useEffect, useRef, useState } from "react";

import {
  fetch_tax_exemption_status,
  upload_tax_exemption_document,
} from "@/services/tax-exemption.client";
import type { TaxExemptionStatus } from "@/types/tax-exemption.types";
import { notifyError, notifySuccess } from "@/utils/notifications";

function UploadDocumentIcon() {
  return (
    <svg
      width="12"
      height="17"
      viewBox="0 0 12 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M6.53125 0.28125L10.7812 4.53125C11.0625 4.8125 11.0625 5.3125 10.7812 5.59375C10.5 5.875 10 5.875 9.71875 5.59375L6.75 2.625V11.3125C6.75 11.7188 6.40625 12.0625 6 12.0625C5.59375 12.0625 5.25 11.7188 5.25 11.3125V2.625L2.28125 5.59375C2 5.875 1.5 5.875 1.21875 5.59375C0.9375 5.3125 0.9375 4.8125 1.21875 4.53125L5.46875 0.28125C5.75 0 6.25 0 6.53125 0.28125ZM0.75 14.5625H11.25C11.6562 14.5625 12 14.9062 12 15.3125C12 15.7188 11.6562 16.0625 11.25 16.0625H0.75C0.34375 16.0625 0 15.7188 0 15.3125C0 14.9062 0.34375 14.5625 0.75 14.5625Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function CartTaxExemptionNotice() {
  const [status, setStatus] = useState<TaxExemptionStatus | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch_tax_exemption_status()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status?.show_notice) {
    return null;
  }

  // Pending: awaiting admin review — nothing for the customer to do here.
  const canUpload = status.notice_type !== "pending";

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();

    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      notifyError("Choose a certificate file to upload.");
      return;
    }

    if (!expiryDate) {
      notifyError("Enter the certificate expiry date.");
      return;
    }

    setIsUploading(true);

    try {
      const result = await upload_tax_exemption_document(file, expiryDate);

      // Instant state update — banner flips to the pending message right away.
      setStatus(result);
      setIsFormOpen(false);
      setExpiryDate("");
      notifySuccess(
        result.message || "Document uploaded — awaiting admin approval."
      );
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : "Upload failed — try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mb-6 max-w-[805px] border-l-4 border-amber bg-[#eef6fb] px-4 py-4 text-link text-black sm:mb-[30px] sm:px-5">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center sm:gap-5">
        <p className="mb-0 leading-snug">{status.message}</p>

        {canUpload ? (
          <button
            type="button"
            onClick={() => setIsFormOpen((open) => !open)}
            className="inline-flex shrink-0 items-center gap-2.5 text-link text-blue transition-colors hover:text-amber"
          >
            <UploadDocumentIcon />
            Upload a new document
          </button>
        ) : null}
      </div>

      {canUpload && isFormOpen ? (
        <form
          onSubmit={handleUpload}
          className="mt-4 flex flex-col gap-3 border-t border-[#c9dcea] pt-4 sm:flex-row sm:items-end"
        >
          <label className="flex-1">
            <span className="mb-1 block text-sm font-semibold text-near-black">
              Certificate (PDF / JPG / PNG)
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="w-full border border-light-gray bg-white px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:text-white"
            />
          </label>

          <label className="sm:w-[170px]">
            <span className="mb-1 block text-sm font-semibold text-near-black">
              Expiry date
            </span>
            <input
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
              className="w-full border border-light-gray bg-white px-3 py-2 text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={isUploading}
            className="inline-flex shrink-0 items-center justify-center bg-amber px-5 py-2.5 text-sm font-semibold uppercase text-white transition-colors hover:bg-blue disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Submit"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
