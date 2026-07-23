/**
 * File Name: CatalogShellSkeleton.tsx
 * Description: Shared sidebar + main shell for catalog-style pages.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import type { ReactNode } from "react";

import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";

function SidebarSkeleton() {
  return (
    <div className="w-full border-t-6 border-blue bg-off-white p-5 xl:p-6">
      {["SCREWS", "NUTS", "WASHERS"].map((section) => (
        <div key={section} className="mb-8 last:mb-0">
          <SkeletonBlock className="mb-5 h-6 w-24" />
          <div className="space-y-0 border-b border-mid-gray/20">
            {Array.from({ length: section === "SCREWS" ? 5 : 3 }).map((_, index) => (
              <div
                key={`${section}-${index}`}
                className="border-b border-mid-gray/40 px-1 py-3"
              >
                <SkeletonBlock className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BreadcrumbSkeleton() {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <SkeletonBlock className="h-4 w-28" />
      <SkeletonBlock className="h-3 w-2" />
      <SkeletonBlock className="h-4 w-20" />
      <SkeletonBlock className="h-3 w-2" />
      <SkeletonBlock className="h-4 w-24" />
    </div>
  );
}

interface CatalogShellSkeletonProps {
  children: ReactNode;
}

export default function CatalogShellSkeleton({
  children,
}: CatalogShellSkeletonProps) {
  return (
    <div className="mx-auto w-full py-6 xl:px-5 xl:py-[30px]">
      <div className="flex flex-col gap-8 lg:flex-row min-h-[calc(100vh-var(--header-height,140px)-var(--footer-height,48px)-60px)]">
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <BreadcrumbSkeleton />
          <SidebarSkeleton />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

export { BreadcrumbSkeleton, SidebarSkeleton };
