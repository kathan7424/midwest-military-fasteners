/**
 * File Name: CategoryGrid.tsx
 * Description: Home hero product category grid.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-07-06
 */

import CategoryColumn from "@/components/pages/Home/Hero/CategoryColumn";
import { CategorySectionData } from "@/types/product-catalog.types";

interface CategoryGridProps {
  categories: CategorySectionData[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="mt-20 w-full max-w-8xl px-0 xl:px-5">
      <div className="grid grid-cols-1 gap-[40px] lg:grid-cols-[1fr_1fr] xl:gap-[60px]">
        {categories.slice(0, 2).map((category) => (
          <section key={category.title}>
            <div className="mb-6">
              <h2 className="mb-2 text-[24px] font-bold leading-none text-white">
                {category.title}
              </h2>
              <div className="h-px w-full bg-white/70" />
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-10">
              {category.columns.map((column) => (
                <div
                  key={column.title}
                  className="w-[calc(50%-16px)] shrink-0 grow-0 sm:w-[calc(33.33%-22px)] md:w-auto"
                >
                  <CategoryColumn title={column.title} items={column.items} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {categories.length > 2 ? (
        <div className="mt-[40px] w-full lg:max-w-[460px] xl:mt-[60px]">
          {categories.slice(2).map((category) => (
            <section key={category.title}>
              <div className="mb-6">
                <h2 className="mb-2 text-[24px] font-bold leading-none text-white">
                  {category.title}
                </h2>
                <div className="h-px w-full bg-white/70" />
              </div>

              <div className="flex flex-wrap gap-x-8 gap-y-10">
                {category.columns.map((column) => (
                  <div
                    key={column.title}
                    className="w-[calc(50%-16px)] shrink-0 grow-0 sm:w-[calc(33.33%-22px)] md:w-auto"
                  >
                    <CategoryColumn title={column.title} items={column.items} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
