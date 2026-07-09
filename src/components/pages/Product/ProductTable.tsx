/**
 * File Name: ProductTable.tsx
 * Description: Product listing table for a part series (e.g. MS35307). Matches Figma
 *              catalog table: P/N, Description, Pkg Qty, tier prices, MFR, Country,
 *              Specs download, Qty + Add to Order.
 * Developer: pod2
 * Created Date: 2026-06-26
 * Last Modified: 2026-07-07
 */

"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Download } from "lucide-react";
import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import QtyAddToOrder from "@/components/shared_Ui/QtyAddToOrder";
import { build_product_path } from "@/utils/catalog-url.utils";
import { has_product_spec_sheet } from "@/utils/spec-parts.utils";

/** A single purchasable product row. Mirror this shape from the API. */
export interface Product {
  id: number;
  slug: string;
  partNumber: string;
  sku: string;
  description: string;
  pkgQty: number;
  price1: string;
  price3: string;
  price5: string;
  price10: string;
  mfr: string;
  country: string;
  specHref: string;
  certHref: string;
  seriesSlug: string;
  seriesLabel?: string;
  categorySlug?: string;
  parentCategorySlug?: string;
  categoryLabel?: string;
  image?: string;
  stock_status?: string;
  stock_quantity?: number | null;
}

function display_table_value(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "number") {
    return value > 0 ? String(value) : "—";
  }

  const trimmed = value.trim();
  return trimmed || "—";
}

function display_price(value: string): string {
  return value.trim() ? value : "—";
}

const thClass = "font-condensed font-bold uppercase";

export const productColumns: ColumnDef<Product>[] = [
  {
    accessorKey: "partNumber",
    header: ({ column }) => (
      <button
        type="button"
        className={`flex items-center gap-1 ${thClass}`}
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        P/N
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => (
      <Link
        href={build_product_path(row.original.slug || row.original.partNumber)}
        prefetch={false}
        className="font-semibold text-amber hover:underline"
      >
        {row.original.partNumber}
      </Link>
    ),
  },
  {
    accessorKey: "description",
    header: () => (
      <span className={`block min-w-[160px] max-w-[160px] xl:min-w-[240px] xl:max-w-[240px] ${thClass}`}>
        Description
      </span>
    ),
    cell: ({ row }) => (
      <span
        className="block min-w-[160px] max-w-[160px] truncate uppercase xl:min-w-[240px] xl:max-w-[240px]"
        title={row.original.description}
      >
        {row.original.description}
      </span>
    ),
  },
  {
    accessorKey: "pkgQty",
    header: () => <span className={`block text-center ${thClass}`}>Pkg Qty</span>,
    cell: ({ row }) => (
      <span className="block text-center">{display_table_value(row.original.pkgQty)}</span>
    ),
  },
  {
    accessorKey: "price1",
    header: () => <span className={`block text-center ${thClass}`}>1 Pkg</span>,
    cell: ({ row }) => (
      <span className="block text-center font-semibold">
        {display_price(row.original.price1)}
      </span>
    ),
  },
  {
    accessorKey: "price3",
    header: () => <span className={`block text-center ${thClass}`}>3 Pkg</span>,
    cell: ({ row }) => (
      <span className="block text-center font-semibold">
        {display_price(row.original.price3)}
      </span>
    ),
  },
  {
    accessorKey: "price5",
    header: () => <span className={`block text-center ${thClass}`}>5 Pkg</span>,
    cell: ({ row }) => (
      <span className="block text-center font-semibold">
        {display_price(row.original.price5)}
      </span>
    ),
  },
  {
    accessorKey: "price10",
    header: () => <span className={`block text-center ${thClass}`}>10 Pkg</span>,
    cell: ({ row }) => (
      <span className="block text-center font-semibold">
        {display_price(row.original.price10)}
      </span>
    ),
  },
  {
    accessorKey: "mfr",
    header: () => <span className={thClass}>Mfr</span>,
    cell: ({ row }) => <span>{display_table_value(row.original.mfr)}</span>,
  },
  {
    accessorKey: "country",
    header: () => <span className={thClass}>Country</span>,
    cell: ({ row }) => <span>{display_table_value(row.original.country)}</span>,
  },
  {
    id: "specs",
    header: () => <span className={`block text-center ${thClass}`}>Specs</span>,
    cell: ({ row }) => {
      const specHref = row.original.specHref;

      if (!has_product_spec_sheet(specHref)) {
        return <span className="block text-center text-mid-gray">—</span>;
      }

      return (
        <a
          href={specHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 font-condensed text-sm font-bold uppercase text-amber hover:underline"
        >
          <Download className="size-4" />
          Download
        </a>
      );
    },
  },
  {
    id: "order",
    header: "",
    cell: ({ row }) => (
      <QtyAddToOrder
        size="sm"
        productId={row.original.id}
        sku={row.original.sku}
        productName={row.original.partNumber}
        stockStatus={row.original.stock_status}
        stockQuantity={row.original.stock_quantity}
      />
    ),
  },
];

interface ProductTableProps {
  data: Product[];
  isLoading?: boolean;
  loadingMessage?: string;
}

export default function ProductTable({
  data,
  isLoading = false,
  loadingMessage = "Searching products...",
}: ProductTableProps) {
  return (
    <DataTable
      columns={productColumns}
      data={data}
      enableSorting
      isLoading={isLoading}
      loadingMessage={loadingMessage}
      emptyMessage="No products match your filter."
      className="border-b-[5px] border-blue [&_tbody_tr:nth-child(even)]:bg-off-white [&_tbody_tr:nth-child(odd)]:bg-white [&_tbody_tr:hover]:bg-light-gray/50 [&_thead_th]:bg-navy [&_thead_th]:px-3 [&_thead_th]:py-3 [&_thead_th]:align-middle [&_thead_th]:text-body [&_thead_th]:text-white [&_tbody_td]:px-3 [&_tbody_td]:py-3 [&_tbody_td]:align-middle"
    />
  );
}
