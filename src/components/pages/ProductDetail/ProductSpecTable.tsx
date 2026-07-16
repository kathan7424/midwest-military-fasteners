/**
 * File Name: ProductSpecTable.tsx
 * Description: Vertical spec table for a single product (blue label column +
 *              value column), including the downloadable spec sheet row.
 * Developer: pod2
 * Created Date: 2026-07-01
 * Last Modified: 2026-07-01
 */

import { Download } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Product } from "@/components/pages/Product/ProductTable";
import { has_product_document } from "@/utils/spec-parts.utils";

interface ProductSpecTableProps {
  product: Product;
  /** false = guest view: only the 1 Pkg price row is shown. */
  showTierPricing?: boolean;
}

export default function ProductSpecTable({
  product,
  showTierPricing = true,
}: ProductSpecTableProps) {
  const rows: { label: string; value: React.ReactNode; bold?: boolean }[] = [
    { label: "P/N", value: product.partNumber, bold: true },
    { label: "SKU", value: product.sku },
    { label: "Description", value: product.description },
    { label: "Pkg Qty", value: product.pkgQty },
    { label: "1 Pkg", value: product.price1 },
    ...(showTierPricing
      ? [
          { label: "3 Pkg", value: product.price3 },
          { label: "5 Pkg", value: product.price5 },
          { label: "10 Pkg", value: product.price10 },
        ]
      : []),
    { label: "MFR", value: product.mfr },
  ];

  const thClass =
    "w-32 xl:w-40 bg-blue px-2 sm:px-4 py-3 text-left align-top text-link font-bold uppercase text-white";

  return (
    <table className="w-full border-collapse text-link">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th className={thClass}>{row.label}</th>
            <td
              className={cn(
                "border-b border-light-gray px-2 sm:px-4 py-3 align-top uppercase text-near-black",
                row.bold && "font-bold"
              )}
            >
              {row.value}
            </td>
          </tr>
        ))}

        {has_product_document(product.specHref) ? (
          <tr>
            <th className={thClass}>Spec Sheet</th>
            <td className="px-2 sm:px-4 py-3 align-top">
              <a
                href={product.specHref}
                download
                className="inline-flex items-center gap-1.5 font-semibold uppercase text-amber hover:underline"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M1 16H0V14H12V16H1ZM6.71875 11.7188L6 12.4062L5.28125 11.7188L1.28125 7.71875L0.59375 7L2 5.59375C2.21875 5.78125 3.21875 6.78125 5 8.59375V0H7V8.59375C8.8125 6.78125 9.8125 5.78125 10 5.59375L11.4062 7L10.7188 7.71875L6.71875 11.7188Z" fill="currentColor"/></svg>
                Download Spec Sheet
              </a>
            </td>
          </tr>
        ) : null}

        {has_product_document(product.certHref) ? (
          <tr>
            <th className={thClass}>Certificate</th>
            <td className="px-2 sm:px-4 py-3 align-top">
              <a
                href={product.certHref}
                download
                className="inline-flex items-center gap-1.5 font-semibold uppercase text-amber hover:underline"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M1 16H0V14H12V16H1ZM6.71875 11.7188L6 12.4062L5.28125 11.7188L1.28125 7.71875L0.59375 7L2 5.59375C2.21875 5.78125 3.21875 6.78125 5 8.59375V0H7V8.59375C8.8125 6.78125 9.8125 5.78125 10 5.59375L11.4062 7L10.7188 7.71875L6.71875 11.7188Z" fill="currentColor"/></svg>
                Download Certificate
              </a>
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
