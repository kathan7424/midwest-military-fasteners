/**
 * File Name: ProductTable.tsx
 * Description: Product listing table for a part series (e.g. MS35307). Defines the
 *              column model and renders via the reusable <DataTable>. QTY + Add to
 *              Order use plain inputs/buttons (no extra shadcn components).
 * Developer: pod2
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-26
 */

"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Download } from "lucide-react";
import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import QtyAddToOrder from "@/components/shared_Ui/QtyAddToOrder";

/** A single purchasable product row. Mirror this shape from the API later. */
export interface Product {
  id: number;
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
  seriesSlug: string;
  seriesLabel?: string;
  categorySlug?: string;
  categoryLabel?: string;
  image?: string;
  stock_status?: string;
  stock_quantity?: number | null;
}

export const productColumns: ColumnDef<Product>[] = [
  {
    accessorKey: "partNumber",
    header: ({ column }) => (
      <button
        type="button"
        className="flex items-center gap-1 font-bold uppercase"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        P/N
        <ArrowUpDown className="size-3.5" />
      </button>
    ),
    cell: ({ row }) => (
      <Link
        href={`/product/${row.original.seriesSlug}/${row.original.partNumber}`}
        className="text-blue hover:underline"
      >
        {row.original.partNumber}
      </Link>
    ),
  },
  {
    accessorKey: "description",
    header: () => (
      <span className="block min-w-[220px] max-w-[220px] xl:min-w-[320px] xl:max-w-[320px]">
        Description
      </span>
    ),
    cell: ({ row }) => (
      <span
        className="block min-w-[220px] max-w-[220px] truncate xl:min-w-[320px] xl:max-w-[320px]"
        title={row.original.description}
      >
        {row.original.description}
      </span>
    ),
  },
  { accessorKey: "pkgQty", header: "Pkg Qty" },
  { accessorKey: "price1", header: "1 Pkg" },
  { accessorKey: "price3", header: "3 Pkg" },
  { accessorKey: "price5", header: "5 Pkg" },
  { accessorKey: "price10", header: "10 Pkg" },
  { accessorKey: "mfr", header: "Mfr" },
  { accessorKey: "country", header: "Country" },
  {
    id: "specs",
    header: "Specs",
    cell: ({ row }) => (
      <Link
        href={row.original.specHref}
        className="inline-flex items-center gap-1.5 font-condensed text-amber hover:underline"
      >
        <Download className="size-4" />
        Download
      </Link>
    ),
  },
  {
    id: "order",
    header: "",
    cell: ({ row }) => (
      <QtyAddToOrder
        size="sm"
        productId={row.original.id}
        sku={row.original.sku}
        stockStatus={row.original.stock_status}
        stockQuantity={row.original.stock_quantity}
      />
    ),
  },
];

interface ProductTableProps {
  data: Product[];
}

export default function ProductTable({ data }: ProductTableProps) {
  return (
    <DataTable
      columns={productColumns}
      data={data}
      enableSorting
      emptyMessage="No products match your filter."
      className="border-b-[5px] border-blue [&_thead_th]:bg-navy [&_thead_th]:px-3 [&_thead_th]:py-3 [&_thead_th]:align-middle [&_thead_th]:text-body [&_thead_th]:font-condensed [&_thead_th]:font-bold [&_thead_th]:uppercase [&_thead_th]:text-white [&_tbody_td]:px-3 [&_tbody_td]:py-3"
    />
  );
}
