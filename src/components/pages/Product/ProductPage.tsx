/**
 * File Name: ProductPage.tsx
 * Description: Product listing page — responsive sidebar, hero, part-series
 *              filter, product table and ISO footer.
 * Developer: pod2
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-30
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar/Sidebar";
import ProductTable from "./ProductTable";
import Breadcrumb from "@/components/shared_Ui/Breadcrumb";
import IsoSection from "@/components/shared_Ui/IsoSection";
import type { SidebarCategory } from "@/components/layout/Sidebar/types";
import type { Product } from "./ProductTable";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ProductPageProps {
  title: string;
  description?: string;
  imageSrc?: string;
  products: Product[];
  sidebarCategories: SidebarCategory[];
  breadcrumb: {
    label: string;
    href?: string;
  }[];
  activeGroupId?: string;
  activeSeriesId?: string;
  initialSearch?: string;
  partSeriesLabel?: string;
  currentPage: number;
  totalPages: number;
}

export default function ProductPage({
  title,
  description,
  imageSrc,
  products,
  sidebarCategories,
  breadcrumb,
  activeGroupId,
  activeSeriesId,
  initialSearch = "",
  partSeriesLabel,
  currentPage,
  totalPages,
}: ProductPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState(initialSearch);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams(searchParams.toString());

    if (filter.trim()) {
      params.set("search", filter.trim());
    } else {
      params.delete("search");
    }

    params.set("page", "1");

    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  };

  const build_page_href = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());

    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }

    const query = params.toString();

    return query ? `${pathname}?${query}` : pathname;
  };

  const pagination_pages = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  ).filter((page) => Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages);

  return (
    <div className="mx-auto w-full px-4 py-6 xl:px-5 xl:py-[30px] relative">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <Breadcrumb items={breadcrumb} className="mb-5" />

          <Sidebar
            categories={sidebarCategories}
            activeGroupId={activeGroupId}
            activeSeriesId={activeSeriesId}
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
                  categories={sidebarCategories}
                  activeGroupId={activeGroupId}
                  activeSeriesId={activeSeriesId}
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* Hero */}
          <div className="mb-8 flex items-center gap-5 xl:mb-16 xl:gap-8">
            {imageSrc ? (
              <div className="relative hidden h-28 xl:h-[129px] w-40 xl:w-[194px] shrink-0 sm:block">
                <Image
                  src={imageSrc}
                  alt={title}
                  fill
                  className="object-contain"
                />
              </div>
            ) : null}

            <div>
              <h1 className="mb-4 text-h2 font-bold uppercase leading-heading text-near-black">
                {title}
              </h1>

              {description ? (
                <p className="mb-0 max-w-[770px] text-link text-black">
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          {partSeriesLabel ? (
            <div className="mb-4 text-label font-bold text-mid-gray">
              PART SERIES <span className="text-blue">{partSeriesLabel}</span>
            </div>
          ) : null}

          <form onSubmit={handleSearchSubmit} className="mb-4">
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Start typing to filter products"
              aria-label="Filter products"
              className="w-full border border-light-gray px-4 py-3 text-body text-near-black placeholder:text-mid-gray focus:border-blue"
            />
          </form>

          <ProductTable data={products} />

          {totalPages > 1 ? (
            <nav
              aria-label="Catalog pagination"
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
            >
              {currentPage > 1 ? (
                <Link
                  href={build_page_href(currentPage - 1)}
                  className="inline-flex min-w-10 items-center justify-center border border-light-gray px-3 py-2 text-sm font-semibold text-blue transition-colors hover:border-blue hover:text-navy"
                >
                  Previous
                </Link>
              ) : null}

              {pagination_pages.map((page, index) => {
                const previous = pagination_pages[index - 1];
                const needs_gap = index > 0 && previous && page - previous > 1;

                return (
                  <div key={page} className="flex items-center gap-2">
                    {needs_gap ? (
                      <span className="px-1 text-sm text-mid-gray">...</span>
                    ) : null}

                    <Link
                      href={build_page_href(page)}
                      aria-current={page === currentPage ? "page" : undefined}
                      className={
                        page === currentPage
                          ? "inline-flex h-10 min-w-10 items-center justify-center bg-blue px-3 text-sm font-bold text-white"
                          : "inline-flex h-10 min-w-10 items-center justify-center border border-light-gray px-3 text-sm font-semibold text-blue transition-colors hover:border-blue hover:text-navy"
                      }
                    >
                      {page}
                    </Link>
                  </div>
                );
              })}

              {currentPage < totalPages ? (
                <Link
                  href={build_page_href(currentPage + 1)}
                  className="inline-flex min-w-10 items-center justify-center border border-light-gray px-3 py-2 text-sm font-semibold text-blue transition-colors hover:border-blue hover:text-navy"
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}

          {/* ISO */}
          <IsoSection align="left" className="mt-auto pb-[18px]" />
        </main>
      </div>
    </div>
  );
}