/**

 * File Name: ProductPage.tsx

 * Description: Product listing page — responsive sidebar, hero, part-series

 *              filter, product table and ISO footer.

 * Developer: pod2

 * Created Date: 2026-06-26

 * Last Modified: 2026-07-21

 */



"use client";



import ProductImage from "@/components/shared_Ui/ProductImage";
import Link from "next/link";

import { usePathname, useSearchParams } from "next/navigation";

import { Filter } from "lucide-react";



import Sidebar from "@/components/layout/Sidebar/Sidebar";

import ProductTable from "./ProductTable";

import Breadcrumb from "@/components/shared_Ui/Breadcrumb";

import IsoSection from "@/components/shared_Ui/IsoSection";

import type { SidebarCategory } from "@/components/layout/Sidebar/types";

import type { Product } from "./ProductTable";

import { useCatalogProductSearch } from "@/hooks/use-catalog-product-search";

import { get_category_slug_from_pathname } from "@/utils/catalog-url.utils";

import { hasHtmlContent, hasText } from "@/utils/content.utils";



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

  /** false = guest view: hide the 3/5/10 Pkg tier price columns. */
  showTierPricing?: boolean;

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

  showTierPricing = true,

}: ProductPageProps) {

  const pathname = usePathname();

  const searchParams = useSearchParams();

  const categorySlug =

    get_category_slug_from_pathname(pathname) ?? activeGroupId ?? undefined;

  const seriesSlug = searchParams.get("series") ?? activeSeriesId ?? undefined;



  const {

    filter,

    handleFilterChange,

    handlePageChange,

    handleSeriesChange,

    activeSeriesSlug,

    visibleProducts,

    tablePage,

    tableTotalPages,

    isPaging,

    isPendingSearch,

  } = useCatalogProductSearch({

    products,

    currentPage,

    totalPages,

    initialSearch,

    categorySlug,

    seriesSlug,

    pathname,

  });

  // Sidebar series links within the SAME category page switch instantly via
  // the client-side catalog fetch (same fast path as pagination/search) —
  // no full server round-trip re-fetching sidebar/settings/auth for a filter
  // that only ever changes the product list. A series belonging to a
  // DIFFERENT category still falls through to a real <Link> navigation.
  const handleSidebarSeriesSelect = (seriesId: string, href: string): boolean => {
    // get_category_slug_from_pathname expects a pathname (no query string) —
    // strip it here since series hrefs carry ?series=... on the same segment.
    const target_category = get_category_slug_from_pathname(href.split("?")[0] ?? href);

    if (!categorySlug || target_category !== categorySlug) {
      return false;
    }

    handleSeriesChange(seriesId, href);
    return true;
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

    { length: tableTotalPages },

    (_, index) => index + 1

  ).filter((page) => Math.abs(page - tablePage) <= 2 || page === 1 || page === tableTotalPages);



  return (

    <div className="mx-auto w-full px-4 py-6 xl:px-5 xl:py-[30px] relative">

      <div className="flex flex-col gap-8 lg:flex-row">

        {/* Desktop Sidebar */}

        <aside className="hidden w-[300px] shrink-0 lg:block">

          <Breadcrumb items={breadcrumb} className="mb-5" />



          <Sidebar

            categories={sidebarCategories}

            activeGroupId={categorySlug}

            activeSeriesId={activeSeriesSlug}

            onSeriesSelect={handleSidebarSeriesSelect}

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

                  activeGroupId={categorySlug}

                  activeSeriesId={activeSeriesSlug}

                  onSeriesSelect={handleSidebarSeriesSelect}

                />

              </SheetContent>

            </Sheet>

          </div>



          {/* Hero */}

          <div className="mb-8 flex items-start gap-5 xl:mb-10 xl:gap-8">
            <ProductImage
              src={imageSrc}
              alt={title}
              fill
              categoryImage
              containerClassName="hidden h-28 w-40 shrink-0 sm:block xl:h-[129px] xl:w-[194px]"
              sizes="(min-width: 1280px) 194px, 160px"
            />



            <div className="min-w-0 flex-1">

              <h1 className="mb-4 text-h2 font-bold uppercase leading-heading text-near-black">

                {title}

              </h1>



              {hasHtmlContent(description) ? (
                <div
                  className="mb-0 max-w-[770px] text-link leading-relaxed text-black [&_p:last-child]:mb-0 [&_p]:mb-2"
                  dangerouslySetInnerHTML={{ __html: description as string }}
                />
              ) : hasText(description) ? (
                <p className="mb-0 max-w-[770px] text-link leading-relaxed text-black">
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



          <div className="relative mb-4 w-full max-w-[506px]">

            <input

              type="search"

              value={filter}

              onChange={(event) => handleFilterChange(event.target.value)}

              placeholder="Start typing to filter products"

              aria-label="Filter products"

              className="w-full max-w-[506px] border border-blue px-4 py-3 text-body text-near-black placeholder:text-mid-gray focus:border-blue"

            />

            {isPendingSearch ? (

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-mid-gray">

                Searching...

              </span>

            ) : null}

          </div>



          <div className={isPendingSearch || isPaging ? "opacity-70 transition-opacity" : ""}>

            <ProductTable
              data={visibleProducts}
              isLoading={(isPendingSearch || isPaging) && visibleProducts.length === 0}
              showTierPricing={showTierPricing}
            />

          </div>



          {tableTotalPages > 1 ? (

            <nav

              aria-label="Catalog pagination"

              className="mt-6 flex flex-wrap items-center justify-center gap-2"

            >

              {tablePage > 1 ? (

                <Link
                  href={build_page_href(tablePage - 1)}
                  prefetch={false}
                  onClick={(event) => {
                    event.preventDefault();
                    handlePageChange(tablePage - 1);
                  }}
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
                      prefetch={false}
                      onClick={(event) => {
                        event.preventDefault();
                        if (page !== tablePage) {
                          handlePageChange(page);
                        }
                      }}
                      aria-current={page === tablePage ? "page" : undefined}

                      className={

                        page === tablePage

                          ? "inline-flex h-10 min-w-10 items-center justify-center bg-blue px-3 text-sm font-bold text-white"

                          : "inline-flex h-10 min-w-10 items-center justify-center border border-light-gray px-3 text-sm font-semibold text-blue transition-colors hover:border-blue hover:text-navy"

                      }

                    >

                      {page}

                    </Link>

                  </div>

                );

              })}



              {tablePage < tableTotalPages ? (

                <Link
                  href={build_page_href(tablePage + 1)}
                  prefetch={false}
                  onClick={(event) => {
                    event.preventDefault();
                    handlePageChange(tablePage + 1);
                  }}
                  className="inline-flex min-w-10 items-center justify-center border border-light-gray px-3 py-2 text-sm font-semibold text-blue transition-colors hover:border-blue hover:text-navy"
                >

                  Next

                </Link>

              ) : null}

            </nav>

          ) : null}



          {/* ISO */}

           <IsoSection align="left" className="mt-auto pb-2.5" />

        </main>

      </div>

    </div>

  );

}

