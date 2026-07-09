/**
 * File Name: CartPageSkeleton.tsx
 * Description: Loading skeleton for the cart page.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import CatalogShellSkeleton from "@/components/shared_Ui/skeletons/CatalogShellSkeleton";
import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";

export default function CartPageSkeleton() {
  return (
    <CatalogShellSkeleton>
      <SkeletonBlock className="mb-6 h-[72px] w-full max-w-[805px] border-l-4 border-light-gray" />

      <SkeletonBlock className="mb-5 h-8 w-40 sm:mb-6 sm:h-9" />

      {/* Neutral content area — the cart may be empty, so no table header. */}
      <div className="max-w-[1320px] space-y-3">
        <SkeletonBlock className="h-4 w-full max-w-[560px]" />
        <SkeletonBlock className="h-4 w-full max-w-[440px]" />
        <SkeletonBlock className="h-4 w-full max-w-[500px]" />
      </div>

      <div className="mt-8">
        <SkeletonBlock className="h-12 w-full max-w-[240px]" />
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
