/**
 * File Name: ProductTableSkeleton.tsx
 * Description: Skeleton matching the catalog product data table.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";

interface ProductTableSkeletonProps {
  rows?: number;
}

const TABLE_HEADERS = [
  "P/N",
  "Description",
  "Pkg Qty",
  "1 Pkg",
  "3 Pkg",
  "5 Pkg",
  "10 Pkg",
];

export default function ProductTableSkeleton({
  rows = 8,
}: ProductTableSkeletonProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse">
        <thead>
          <tr className="bg-navy text-left text-link font-bold uppercase text-white">
            {TABLE_HEADERS.map((header) => (
              <th key={header} className="px-3 py-3 sm:px-4">
                {header}
              </th>
            ))}
            <th className="px-3 py-3 sm:px-4">Qty</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="border-b border-light-gray">
              <td className="px-3 py-3 sm:px-4">
                <SkeletonBlock className="h-4 w-20" />
              </td>
              <td className="px-3 py-3 sm:px-4">
                <SkeletonBlock className="h-4 w-48 max-w-[320px]" />
              </td>
              <td className="px-3 py-3 text-center sm:px-4">
                <SkeletonBlock className="mx-auto h-4 w-8" />
              </td>
              <td className="px-3 py-3 text-center sm:px-4">
                <SkeletonBlock className="mx-auto h-4 w-12" />
              </td>
              <td className="px-3 py-3 text-center sm:px-4">
                <SkeletonBlock className="mx-auto h-4 w-12" />
              </td>
              <td className="px-3 py-3 text-center sm:px-4">
                <SkeletonBlock className="mx-auto h-4 w-12" />
              </td>
              <td className="px-3 py-3 text-center sm:px-4">
                <SkeletonBlock className="mx-auto h-4 w-12" />
              </td>
              <td className="px-3 py-3 sm:px-4">
                <SkeletonBlock className="h-9 w-28" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
