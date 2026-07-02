import { CATEGORY_DATA } from "./categoryData";
import CategoryColumn from "./CategoryColumn";

export default function CategoryGrid() {
  return (
    <div className="mt-20 w-full max-w-8xl px-0 xl:px-5">
      {/* Top Row */}
      <div className="grid grid-cols-1 gap-[40px] lg:grid-cols-[1fr_1fr] xl:gap-[60px]">
        {CATEGORY_DATA.slice(0, 2).map((category) => (
          <section key={category.title}>
            {/* Section Heading */}
            <div className="mb-6">
              <h2 className="mb-2 text-[24px] font-bold leading-none text-white">
                {category.title}
              </h2>

              <div className="h-px w-full bg-white/70" />
            </div>

            {/* Columns */}
            <div className="flex flex-wrap gap-x-8 gap-y-10">
              {category.columns.map((column) => (
                <div
                  key={column.title}
                  className="w-[calc(50%-16px)] sm:w-[calc(33.33%-22px)] md:w-auto grow-0 shrink-0"
                >
                  <CategoryColumn
                    title={column.title}
                    items={column.items}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Bottom Row */}
      <div className="mt-[40px] w-full xl:mt-[60px] lg:max-w-[460px]">
        {CATEGORY_DATA.slice(2).map((category) => (
          <section key={category.title}>
            {/* Section Heading */}
            <div className="mb-6">
              <h2 className="mb-2 text-[24px] font-bold leading-none text-white">
                {category.title}
              </h2>

              <div className="h-px w-full bg-white/70" />
            </div>

            {/* Columns */}
            <div className="flex flex-wrap gap-x-8 gap-y-10">
                {category.columns.map((column) => (
                  <div
                    key={column.title}
                    className="w-[calc(50%-16px)] sm:w-[calc(33.33%-22px)] md:w-auto grow-0 shrink-0"
                  >
                    <CategoryColumn
                      title={column.title}
                      items={column.items}
                    />
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}