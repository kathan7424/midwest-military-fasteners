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

interface ProductSpecTableProps {
  product: Product;
}

export default function ProductSpecTable({ product }: ProductSpecTableProps) {
  const rows: { label: string; value: React.ReactNode; bold?: boolean }[] = [
    { label: "P/N", value: product.partNumber, bold: true },
    { label: "SKU", value: product.sku },
    { label: "Description", value: product.description },
    { label: "Pkg Qty", value: product.pkgQty },
    { label: "1 Pkg", value: product.price1 },
    { label: "3 Pkg", value: product.price3 },
    { label: "5 Pkg", value: product.price5 },
    { label: "10 Pkg", value: product.price10 },
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

        <tr>
          <th className={thClass}>Spec Sheet</th>
          <td className="px-2 sm:px-4 py-3 align-top">
            <a
              href={product.specHref}
              className="inline-flex items-center gap-1.5 font-condensed uppercase text-amber hover:underline"
            >
              <Download className="size-4" />
              Download Spec Sheet
            </a>
            <p className="mt-2 text-sm italic text-mid-gray">
              Legacy spec sheet may not match current milspec branding
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
