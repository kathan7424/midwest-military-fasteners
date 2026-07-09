/**
 * File Name: ProductDetailSkeleton.tsx
 * Description: Loading skeleton for single product detail pages.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import CatalogShellSkeleton from "@/components/shared_Ui/skeletons/CatalogShellSkeleton";
import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";

export default function ProductDetailSkeleton() {
  return (
    <CatalogShellSkeleton>
      <div className="mb-6 lg:hidden">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-3 w-2" />
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-3 w-2" />
          <SkeletonBlock className="h-4 w-32" />
        </div>
      </div>

      <SkeletonBlock className="mb-4 h-9 w-72 max-w-full sm:h-10" />
      <SkeletonBlock className="mb-8 h-4 w-full max-w-[620px]" />
      <SkeletonBlock className="mb-8 h-4 w-full max-w-[520px]" />

      <div className="flex max-w-auto flex-col gap-5 lg:flex-row lg:items-start xl:max-w-[1000px] xl:gap-[130px]">
        <div className="lg:w-[290px] xl:w-auto">
          <SkeletonBlock className="h-[140px] w-[280px] xl:h-[199px] xl:w-[298px]" />
          <div className="mt-6 flex items-center gap-3">
            <SkeletonBlock className="h-12 w-28" />
            <SkeletonBlock className="h-12 w-36" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="overflow-hidden border border-light-gray">
            <div className="grid grid-cols-2 gap-px bg-light-gray sm:grid-cols-3">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="bg-white p-4">
                  <SkeletonBlock className="mb-2 h-3 w-20" />
                  <SkeletonBlock className="h-4 w-full max-w-[140px]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center gap-6 pb-[18px] pt-6">
        <SkeletonBlock className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-56" />
          <SkeletonBlock className="h-4 w-40" />
        </div>
      </div>
    </CatalogShellSkeleton>
  );
}
