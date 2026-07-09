/**
 * File Name: CatalogPageSkeleton.tsx
 * Description: Loading skeleton for product catalog / category listing pages.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import CatalogShellSkeleton from "@/components/shared_Ui/skeletons/CatalogShellSkeleton";
import ProductTableSkeleton from "@/components/shared_Ui/skeletons/ProductTableSkeleton";
import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";

export default function CatalogPageSkeleton() {
  return (
    <CatalogShellSkeleton>
      <div className="mb-6 lg:hidden">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-3 w-2" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
      </div>

      <div className="mb-8 flex items-start gap-5 xl:mb-10 xl:gap-8">
        <SkeletonBlock className="hidden h-28 w-40 shrink-0 sm:block xl:h-[129px] xl:w-[194px]" />
        <div className="min-w-0 flex-1">
          <SkeletonBlock className="mb-4 h-9 w-64 max-w-full sm:h-10 sm:w-80" />
          <SkeletonBlock className="mb-2 h-4 w-full max-w-[620px]" />
          <SkeletonBlock className="h-4 w-full max-w-[480px]" />
        </div>
      </div>

      <SkeletonBlock className="mb-4 h-5 w-40" />

      <SkeletonBlock className="mb-4 h-12 w-full" />

      <ProductTableSkeleton />

      <div className="mt-6 flex justify-center gap-2">
        <SkeletonBlock className="h-10 w-24" />
        <SkeletonBlock className="h-10 w-10" />
        <SkeletonBlock className="h-10 w-10" />
        <SkeletonBlock className="h-10 w-10" />
        <SkeletonBlock className="h-10 w-24" />
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
