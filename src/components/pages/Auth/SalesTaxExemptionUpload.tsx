/**
 * File Name: SalesTaxExemptionUpload.tsx
 * Description: Figma-style sales tax doc upload — read-only field + UPLOAD button.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

"use client";

import { useEffect, useRef } from "react";
import { FaFileArrowUp } from "react-icons/fa6";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
const ACCEPTED_EXTENSIONS = ACCEPTED_TYPES.split(",");

interface SalesTaxExemptionUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  error?: string;
  onSizeError?: () => void;
  onTypeError?: () => void;
}

export default function SalesTaxExemptionUpload({
  file,
  onFileChange,
  error,
  onSizeError,
  onTypeError,
}: SalesTaxExemptionUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [file]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;

    if (!selected) {
      onFileChange(null);
      return;
    }

    const extension = `.${selected.name.split(".").pop()?.toLowerCase() ?? ""}`;

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      onTypeError?.();
      event.target.value = "";
      onFileChange(null);
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      onSizeError?.();
      event.target.value = "";
      onFileChange(null);
      return;
    }

    onFileChange(selected);
  };

  return (
    <div>
      {/* <label
        htmlFor="certificate_display"
        className="mb-1.5 block text-sm font-semibold text-dark-gray"
      >
        Sales Tax Exemption Doc
      </label> */}

      <div
        className={`flex items-center h-10 overflow-hidden bg-white ${
          error ? "border border-red-300" : "rounded-none border border-[#666666] bg-white ring-0 focus-within:ring-1 focus-within:ring-brand focus-within:outline-none shadow-none"
        }`}
      >
        <input
          id="certificate_display"
          type="text"
          readOnly
          value={file?.name || ""}
          placeholder="Upload Sales Tax Exemption Doc"
          className="min-w-0 flex-1 border-0 bg-transparent px-3 text-link text-[#989898] placeholder:text-[#989898] focus:outline-none ring-0 focus:ring-0 shadow-none"
        />

        <input
          ref={fileInputRef}
          id="certificate"
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          className="flex h-full shrink-0 items-center gap-1.5 bg-blue px-4 text-link font-bold uppercase text-white transition-colors hover:bg-navy ring-0 focus-within:ring-1 focus-within:ring-brand"
          onClick={() => fileInputRef.current?.click()}
        >
          <FaFileArrowUp aria-hidden="true" />
          UPLOAD
        </button>
      </div>

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
