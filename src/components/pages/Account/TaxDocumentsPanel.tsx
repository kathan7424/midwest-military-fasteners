/**
 * File Name: TaxDocumentsPanel.tsx
 * Description: My Account → Documents — Tax Exemption Certificate:
 *   shows status + expiry if on file; upload form if missing/expired/rejected.
 *   WooCommerce-standard layout with skeleton loading.
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Upload, CheckCircle, Clock, AlertCircle } from "lucide-react";

import DatePickerField from "@/components/shared_Ui/DatePickerField";
import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";
import SalesTaxExemptionUpload from "@/components/pages/Auth/SalesTaxExemptionUpload";
import {
  fetch_tax_exemption_status,
  upload_tax_exemption_document,
} from "@/services/tax-exemption.client";
import type { TaxExemptionStatus } from "@/types/tax-exemption.types";

function format_date(value: string): string {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: TaxExemptionStatus }) {
  const isExpiredOrRejected =
    status.notice_type === "expired" || status.status === "rejected";
  const isPending = status.status === "pending";
  const isApproved = status.is_tax_exempt;
  const isExpiring = status.notice_type === "expiring";

  let Icon = FileText;
  let label = "Not Submitted";
  let cls = "bg-off-white text-dark-gray";

  if (isApproved && !isExpiredOrRejected) {
    Icon = CheckCircle;
    label = isExpiring ? "Approved — Expiring Soon" : "Approved";
    cls = isExpiring ? "bg-[#fff4ce] text-[#996800]" : "bg-[#e6f4ea] text-[#1a7f37]";
  } else if (isPending) {
    Icon = Clock;
    label = "Pending Approval";
    cls = "bg-[#eef6fb] text-[#0e6990]";
  } else if (isExpiredOrRejected) {
    Icon = AlertCircle;
    label = status.notice_type === "expired" ? "Expired" : "Rejected";
    cls = "bg-[#fce8e8] text-[#b32d2e]";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold uppercase ${cls}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function TaxDocumentsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <SkeletonBlock className="h-4 w-full max-w-lg" />
        <SkeletonBlock className="h-4 w-3/4 max-w-md" />
      </div>
      <div className="border border-light-gray bg-off-white p-5 space-y-4">
        <SkeletonBlock className="h-8 w-36" />
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="h-4 w-44" />
        </div>
      </div>
    </div>
  );
}

function UploadForm({
  isResubmit,
  onSuccess,
}: {
  isResubmit: boolean;
  onSuccess: (updated: TaxExemptionStatus) => void;
}) {
  const [certificate, setCertificate] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldError("");

    if (!certificate) {
      setFieldError("Please upload your sales tax exemption document.");
      return;
    }
    if (!expiryDate) {
      setFieldError("Expiry date is required.");
      return;
    }
    const expiry = new Date(`${expiryDate}T00:00:00`);
    if (expiry <= new Date()) {
      setFieldError("Expiry date must be a future date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await upload_tax_exemption_document(certificate, expiryDate);
      onSuccess(result);
    } catch (err) {
      setFieldError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-8 border-t border-light-gray pt-8">
      <h3 className="mb-2 text-label font-bold uppercase text-near-black">
        {isResubmit ? "Upload a New Document" : "Submit Tax Exemption Certificate"}
      </h3>
      <p className="mb-6 max-w-2xl text-link text-dark-gray">
        {isResubmit
          ? "Upload a new certificate to replace the current one. An admin will review it before tax-free checkout applies."
          : "Upload your sales tax exemption certificate (PDF, JPG, PNG, or DOC, max 5 MB). An admin will review and approve it — you will receive an email confirmation."}
      </p>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
        className="max-w-xl space-y-5"
      >
        <DatePickerField
          label="Certificate Expiration Date"
          value={expiryDate}
          onChange={(v) => {
            setExpiryDate(v);
            setFieldError("");
          }}
          minValue={new Date().toISOString().slice(0, 10)}
          required
        />

        <SalesTaxExemptionUpload
          file={certificate}
          onFileChange={(f) => {
            setCertificate(f);
            setFieldError("");
          }}
          error=""
        />

        {fieldError ? (
          <p className="text-sm text-red-600">{fieldError}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 bg-amber px-6 py-3 text-link font-semibold uppercase text-white transition-colors hover:bg-blue disabled:opacity-50"
        >
          <Upload className="size-4" aria-hidden="true" />
          {isSubmitting ? "Uploading…" : "Submit for Approval"}
        </button>
      </form>
    </div>
  );
}

export default function TaxDocumentsPanel() {
  const [taxStatus, setTaxStatus] = useState<TaxExemptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    void fetch_tax_exemption_status()
      .then((data) => {
        setTaxStatus(data);
      })
      .catch(() => {
        setLoadError("Unable to load your tax exemption details.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const needsUpload =
    !taxStatus?.has_certificate ||
    taxStatus.notice_type === "expired" ||
    taxStatus.status === "rejected";

  const isPending = taxStatus?.status === "pending" && taxStatus.has_certificate;

  if (isLoading) {
    return <TaxDocumentsSkeleton />;
  }

  if (loadError) {
    return <p className="text-link text-red-600">{loadError}</p>;
  }

  return (
    <div>
      <p className="mb-6 max-w-2xl text-link text-dark-gray">
        Your sales tax exemption certificate is stored here. Once approved, you
        will pay <strong className="text-near-black">$0 in sales tax</strong> at
        checkout until the certificate expires.
      </p>

      {taxStatus ? (
        <div className="mb-6 max-w-3xl border border-light-gray bg-off-white p-5">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <StatusBadge status={taxStatus} />
            {taxStatus.is_tax_exempt && taxStatus.notice_type !== "expiring" ? (
              <span className="text-sm text-[#1a7f37]">
                ✓ Tax exempt at checkout
              </span>
            ) : null}
          </div>

          <dl className="grid gap-3 text-link sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-dark-gray">
                Expiration Date
              </dt>
              <dd className="mt-0.5 text-near-black">
                {format_date(taxStatus.expiry_date)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-dark-gray">
                Approval Status
              </dt>
              <dd className="mt-0.5 capitalize text-near-black">
                {taxStatus.status || (taxStatus.has_certificate ? "Pending" : "Not submitted")}
              </dd>
            </div>
            {taxStatus.submitted_at ? (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-dark-gray">
                  Submitted
                </dt>
                <dd className="mt-0.5 text-near-black">
                  {format_date(taxStatus.submitted_at.slice(0, 10))}
                </dd>
              </div>
            ) : null}
          </dl>

          {taxStatus.certificate_url ? (
            <p className="mt-5">
              <a
                href={taxStatus.certificate_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-link font-semibold text-blue hover:text-amber"
              >
                <FileText className="size-4" aria-hidden="true" />
                View uploaded certificate
              </a>
            </p>
          ) : null}

          {taxStatus.message && taxStatus.show_notice ? (
            <p className="mt-5 border-l-4 border-amber bg-[#fffbe6] px-4 py-3 text-link text-near-black">
              {taxStatus.message}
            </p>
          ) : null}

          {isPending ? (
            <p className="mt-5 border-l-4 border-blue bg-[#eef6fb] px-4 py-3 text-link text-near-black">
              Your certificate is under review. You will receive an email once
              approved. No action needed.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mb-6 max-w-3xl border border-light-gray bg-off-white p-5">
          <p className="text-link text-dark-gray">
            No tax exemption certificate on file.
          </p>
        </div>
      )}

      {needsUpload ? (
        <UploadForm
          isResubmit={Boolean(taxStatus?.has_certificate)}
          onSuccess={(updated) => {
            setTaxStatus(updated);
          }}
        />
      ) : null}
    </div>
  );
}
