/**
 * File Name: ProductDetailPage.tsx
 * Description: Product detail page — responsive sidebar shell + breadcrumb, hero
 *              (title / description / image / add-to-order) and the spec table,
 *              with the ISO footer. Static frontend; data passed in as props.
 * Developer: pod2
 * Created Date: 2026-07-01
 * Last Modified: 2026-07-01
 */

import Image from "next/image";
import { Filter } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar/Sidebar";
import Breadcrumb from "@/components/shared_Ui/Breadcrumb";
import IsoSection from "@/components/shared_Ui/IsoSection";
import QtyAddToOrder from "@/components/shared_Ui/QtyAddToOrder";
import type { SidebarCategory } from "@/components/layout/Sidebar/types";
import type { Product } from "@/components/pages/Product/ProductTable";
import ProductSpecTable from "./ProductSpecTable";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ProductDetailPageProps {
  series: string;
  product: Product;
  sidebarCategories: SidebarCategory[];
}

export default function ProductDetailPage({
  series,
  product,
  sidebarCategories,
}: ProductDetailPageProps) {
  const breadcrumb = [
    { label: "PRODUCT CATALOG", href: "/product" },
    ...(product.categorySlug && product.categoryLabel
      ? [
          {
            label: product.categoryLabel.toUpperCase(),
            href: `/product-category/${product.categorySlug}`,
          },
        ]
      : []),
    { label: product.seriesLabel?.toUpperCase() || series.toUpperCase() },
    { label: product.partNumber },
  ];

  return (
    <div className="mx-auto w-full px-4 py-6 xl:px-5 xl:py-[30px] relative">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <Breadcrumb items={breadcrumb} className="mb-5" />
          <Sidebar
            categories={sidebarCategories}
            activeGroupId={product.categorySlug}
            activeSeriesId={product.seriesSlug}
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

              <SheetContent side="left" className="w-[340px] overflow-y-auto p-0">
                <SheetHeader className="border-b">
                  <SheetTitle>Product Categories</SheetTitle>
                </SheetHeader>

                <Sidebar
                  categories={sidebarCategories}
                  activeGroupId={product.categorySlug}
                  activeSeriesId={product.seriesSlug}
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* Title + description */}
          <h1 className="mb-4 text-h2 font-bold uppercase leading-heading text-near-black">
            <span className="text-mid-gray">Part</span>{" "}
            {product.partNumber}
          </h1>

          <p className="mb-8 max-w-[770px] text-link text-black">
            {product.description}
          </p>

          {/* Image + spec table */}
          <div className="flex flex-col gap-5 xl:gap-[130px] lg:flex-row lg:items-start max-w-auto xl:max-w-[1000px]">
            <div className="lg:w-[290px] xl:w-auto">
              {product.image ? (
                <div className="relative h-[140px] xl:h-[199px] w-[280px] xl:w-[298px]">
                  <Image
                    src={product.image}
                    alt={product.partNumber}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : null}

              <QtyAddToOrder
                size="lg"
                className="mt-6"
                productId={product.id}
                sku={product.sku}
              />
            </div>

            <div className="lg:flex-1">
              <ProductSpecTable product={product} />
            </div>
          </div>

          {/* ISO */}
          <IsoSection align="left" className="mt-auto pb-[18px]" />
        </main>
      </div>
    </div>
  );
}
