/**
 * File Name: ProductPage.tsx
 * Description: Product listing page — responsive sidebar, hero, part-series
 *              filter, product table and ISO footer.
 * Developer: pod2
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-30
 */

"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Filter } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar/Sidebar";
import ProductTable from "./ProductTable";
import Breadcrumb from "@/components/shared_Ui/Breadcrumb";
import IsoSection from "@/components/shared_Ui/IsoSection";
import { MOCK_PRODUCTS, HERO } from "./productData";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function ProductPage() {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();

    if (!q) return MOCK_PRODUCTS;

    return MOCK_PRODUCTS.filter(
      (p) =>
        p.partNumber.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [filter]);

  const breadcrumb = [
    { label: "SCREWS", href: "#" },
    { label: "HEX CAP SCREWS", href: "#" },
    { label: "MS35307" },
  ];

  return (
    <div className="mx-auto w-full px-4 py-6 xl:px-5 xl:py-[30px] relative">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <Breadcrumb items={breadcrumb} className="mb-5" />

          <Sidebar
            activeGroupId="hex-cap-screws"
            activeSeriesId="ms35307"
          />
        </aside>

        {/* Main Content */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Mobile / Tablet */}
          <div className="mb-6 lg:hidden">
            <Breadcrumb items={breadcrumb} className="mb-4" />

            <Sheet>
              <SheetTrigger className="fixed left-0 top-[52%] indent-[-1111px] z-1 flex items-center rounded-0 border-0 border-light-gray bg-amber px-4 py-3 text-link text-white hover:bg-light-gray transition">
                <Filter className="h-5 w-5" />
                Product Categories
              </SheetTrigger>

              <SheetContent
                side="left"
                className="w-[340px] overflow-y-auto p-0"
              >
                <SheetHeader className="border-b">
                  <SheetTitle>Product Categories</SheetTitle>
                </SheetHeader>

                <Sidebar
                  activeGroupId="hex-cap-screws"
                  activeSeriesId="ms35307"
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* Hero */}
          <div className="mb-8 flex items-center gap-5 xl:mb-16 xl:gap-8">
            <div className="relative hidden h-28 xl:h-[129px] w-40 xl:w-[194px] shrink-0 sm:block">
              <Image
                src="/images/hex-cap-screws.webp"
                alt={HERO.title}
                fill
                className="object-contain"
              />
            </div>

            <div>
              <h1 className="mb-4 text-h2 font-bold uppercase leading-heading text-near-black">
                {HERO.title}
              </h1>

              <p className="mb-0 max-w-[770px] text-link text-black">
                {HERO.description}
              </p>
            </div>
          </div>

          {/* Part Series */}
          <div className="mb-4 text-label font-bold text-mid-gray">
            PART SERIES <span className="text-blue">MS35307</span>
          </div>

          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Start typing to filter products"
            aria-label="Filter products"
            className="mb-4 w-full border border-light-gray px-4 py-3 text-body text-near-black placeholder:text-mid-gray focus:border-blue"
          />

          <ProductTable data={filtered} />

          {/* ISO */}
          <IsoSection align="left" className="mt-auto pb-[18px]" />
        </main>
      </div>
    </div>
  );
}