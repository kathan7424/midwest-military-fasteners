/**
 * File Name: CmsPageSkeleton.tsx
 * Description: Loading skeleton for CMS / generic content pages.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";

export default function CmsPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 xl:px-5 xl:py-14">
      <SkeletonBlock className="mb-6 h-10 w-72 max-w-full" />
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-full max-w-[90%]" />
        <SkeletonBlock className="h-4 w-full max-w-[82%]" />
        <SkeletonBlock className="h-4 w-full max-w-[76%]" />
      </div>
      <div className="mt-8 space-y-3">
        <SkeletonBlock className="h-4 w-full max-w-[88%]" />
        <SkeletonBlock className="h-4 w-full max-w-[70%]" />
      </div>
    </div>
  );
}
