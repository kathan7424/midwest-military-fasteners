/**
 * File Name: HomePageSkeleton.tsx
 * Description: Loading skeleton for the home hero page.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";

export default function HomePageSkeleton() {
  return (
    <section className="relative overflow-hidden bg-amber">
      <div className="relative z-10">
        <div className="mx-auto flex min-h-[760px] max-w-8xl flex-col items-center px-5 pt-32 pb-20">
          <SkeletonBlock className="mb-14 h-14 w-full max-w-[900px] bg-white/30" />
          <SkeletonBlock className="mb-20 h-14 w-full max-w-[800px] bg-white/40" />

          <div className="grid w-full max-w-8xl grid-cols-1 gap-10 lg:grid-cols-2 xl:gap-[60px]">
            {Array.from({ length: 2 }).map((_, section_index) => (
              <div key={section_index}>
                <SkeletonBlock className="mb-6 h-7 w-32 bg-white/35" />
                <div className="flex flex-wrap gap-x-8 gap-y-8">
                  {Array.from({ length: 3 }).map((__, column_index) => (
                    <div key={column_index} className="w-[calc(50%-16px)] sm:w-[calc(33.33%-22px)] md:w-auto">
                      <SkeletonBlock className="mb-4 h-5 w-28 bg-white/35" />
                      <div className="space-y-2">
                        {Array.from({ length: 5 }).map((___, item_index) => (
                          <SkeletonBlock
                            key={item_index}
                            className="h-4 w-full max-w-[180px] bg-white/25"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
