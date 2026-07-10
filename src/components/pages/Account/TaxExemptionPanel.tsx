/**
 * File Name: TaxExemptionPanel.tsx
 * Description: My Account — sales tax exemption status + re-upload.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

"use client";

import { useEffect, useState } from "react";

import { parseDate } from "@internationalized/date";

import { DatePicker } from "@/components/application/date-picker/date-picker";
import SalesTaxExemptionUpload from "@/components/pages/Auth/SalesTaxExemptionUpload";
import {
  fetch_tax_exemption_status,
  upload_tax_exemption_document,
} from "@/services/tax-exemption.client";
import type { TaxExemptionStatus } from "@/types/tax-exemption.types";

interface TaxExemptionPanelProps {
  initialStatus?: TaxExemptionStatus | null;
}

function format_display_date(value: string): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function get_status_label(status: TaxExemptionStatus): string {
  if (status.notice_type === "expired") {
    return "Expired";
  }

  if (status.notice_type === "expiring") {
    return "Expiring Soon";
  }

  switch (status.status) {
    case "approved":
      return "Approved";
    case "pending":
      return "Pending Approval";
    case "rejected":
      return "Rejected";
    default:
      return status.has_certificate ? "On File" : "Not Submitted";
  }
}

function get_status_badge_class(status: TaxExemptionStatus): string {
  if (status.is_tax_exempt) {
    return "bg-[#e6f4ea] text-[#1a7f37]";
  }

  if (status.notice_type === "expired" || status.status === "rejected") {
    return "bg-[#fce8e8] text-[#b32d2e]";
  }

  if (status.notice_type === "expiring" || status.status === "pending") {
    return "bg-[#fff4ce] text-[#996800]";
  }

  return "bg-off-white text-dark-gray";
}

export default function TaxExemptionPanel({
  initialStatus = null,
}: TaxExemptionPanelProps) {
  const [status, setStatus] = useState<TaxExemptionStatus | null>(initialStatus);
  const [loadError, setLoadError] = useState("");
  const [certificate, setCertificate] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState(initialStatus?.expiry_date ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch_tax_exemption_status()
      .then((data) => {
        setStatus(data);
        setLoadError("");
        if (data.expiry_date) {
          setExpiryDate(data.expiry_date);
        }
      })
      .catch(() => {
        if (!initialStatus) {
          setLoadError("Unable to load your tax exemption details.");
        }
      });
  }, [initialStatus]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!certificate) {
      setError("Please upload your sales tax exemption document.");
      return;
    }

    if (!expiryDate) {
      setError("Expiry date is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await upload_tax_exemption_document(certificate, expiryDate);
      setStatus(response);
      setMessage(response.message || "Document uploaded successfully.");
      setCertificate(null);
    } catch (upload_error) {
      setError(
        upload_error instanceof Error ? upload_error.message : "Upload failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const show_existing = Boolean(status?.has_certificate || status?.certificate_url);

  return (
    <section id="tax-exemption" className="mt-10 border-t border-light-gray pt-8">
      <h2 className="mb-2 text-h5 font-bold uppercase text-near-black">
        Sales Tax Exemption
      </h2>
      <p className="mb-6 max-w-2xl text-link text-dark-gray">
        Your registration tax exemption certificate appears here. An admin must
        approve it before tax-free checkout applies.
      </p>

      {loadError ? (
        <p className="mb-4 text-sm text-red-600">{loadError}</p>
      ) : null}

      {status ? (
        <div className="mb-6 max-w-3xl border border-light-gray bg-off-white p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex px-3 py-1 text-sm font-semibold uppercase ${get_status_badge_class(status)}`}
            >
              {get_status_label(status)}
            </span>
            {status.is_tax_exempt ? (
              <span className="text-sm text-[#1a7f37]">Tax exempt at checkout</span>
            ) : null}
          </div>

          <div className="grid gap-3 text-link text-near-black sm:grid-cols-2">
            <p>
              <span className="font-semibold">Expiration Date:</span>{" "}
              {format_display_date(status.expiry_date)}
            </p>
            <p>
              <span className="font-semibold">Approval Status:</span>{" "}
              {status.status || (show_existing ? "Pending" : "Not submitted")}
            </p>
            {status.submitted_at ? (
              <p>
                <span className="font-semibold">Submitted:</span>{" "}
                {format_display_date(status.submitted_at.slice(0, 10))}
              </p>
            ) : null}
            <p>
              <span className="font-semibold">Tax Exempt:</span>{" "}
              {status.is_tax_exempt ? "Yes" : "No"}
            </p>
          </div>

          {status.certificate_url ? (
            <p className="mt-4">
              <a
                href={status.certificate_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link font-semibold text-blue hover:text-amber"
              >
                View uploaded certificate
              </a>
            </p>
          ) : null}

          {status.message && status.show_notice ? (
            <p className="mt-4 border-l-4 border-amber bg-[#eef6fb] px-4 py-3 text-link text-near-black">
              {status.message}
            </p>
          ) : null}
        </div>
      ) : null}

      <h3 className="mb-4 text-label font-bold uppercase text-near-black">
        {show_existing ? "Upload a New Document" : "Submit Tax Exemption Document"}
      </h3>

      <form onSubmit={(event) => void handleSubmit(event)} className="max-w-xl space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-dark-gray">
            Expiration Date
          </p>
          <DatePicker
            aria-label="Certificate expiration date"
            value={expiryDate ? parseDate(expiryDate) : null}
            onChange={(date) => setExpiryDate(date ? date.toString() : "")}
            minValue={parseDate(new Date().toISOString().slice(0, 10))}
            placeholder="Expiration Date"
            size="md"
            buttonClassName="h-12 w-full rounded-none border border-[#666666] bg-white px-3 text-left font-normal focus-visible:outline-offset-0 focus:ring focus-within:ring-1 focus-within:ring-brand shadow-none text-[16px] text-[#989898]"
          />
        </div>

        <SalesTaxExemptionUpload
          file={certificate}
          onFileChange={setCertificate}
          error={error}
        />

        {message ? <p className="text-sm text-blue">{message}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-amber px-5 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-blue disabled:opacity-60"
        >
          {isSubmitting ? "Uploading..." : "Submit for Approval"}
        </button>
      </form>
    </section>
  );
}
