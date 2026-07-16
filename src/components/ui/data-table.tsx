/**
 * File Name: data-table.tsx
 * Description: Reusable, generic data table built on @tanstack/react-table + shadcn <Table>.
 *              Supports column-defined rendering, optional client-side sorting, and a custom
 *              empty state. Pass `columns` (ColumnDef[]) and `data` to render.
 * Developer: pod2
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-26
 */

"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Enable client-side sorting (column headers become sortable). Default: false. */
  enableSorting?: boolean;
  /** Message shown when there are no rows. */
  emptyMessage?: string;
  /** Show a loading row instead of the empty state. */
  isLoading?: boolean;
  loadingMessage?: string;
  /** Optional className passed to the wrapping container. */
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  enableSorting = false,
  emptyMessage = "No results.",
  isLoading = false,
  loadingMessage = "Loading...",
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(enableSorting
      ? {
          onSortingChange: setSorting,
          getSortedRowModel: getSortedRowModel(),
          state: { sorting },
        }
      : {}),
  });

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center align-middle"
              >
                {isLoading ? loadingMessage : emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
