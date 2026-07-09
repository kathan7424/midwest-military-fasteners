/**
 * File Name: CartPageView.tsx
 * Description: Figma-style cart page with sidebar, tax notice, and dynamic cart table.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

"use client";

import { Filter } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar/Sidebar";
import IsoSection from "@/components/shared_Ui/IsoSection";
import type { SidebarCategory } from "@/components/layout/Sidebar/types";
import CartPageContent from "./CartPageContent";
import CartTaxExemptionNotice from "./CartTaxExemptionNotice";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface CartPageViewProps {
  sidebarCategories: SidebarCategory[];
}

export default function CartPageView({ sidebarCategories }: CartPageViewProps) {
  return (
    <div className="mx-auto w-full px-4 py-6 xl:px-5 xl:py-[30px] relative">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <Sidebar categories={sidebarCategories} />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="mb-6 lg:hidden">
            <Sheet>
              <SheetTrigger className="fixed left-0 top-[52%] indent-[-1111px] z-1 flex items-center rounded-0 border-0 border-light-gray bg-amber px-4 py-3 text-link text-white hover:bg-light-gray transition">
                <Filter className="h-5 w-5" />
                Product Categories
              </SheetTrigger>

              <SheetContent side="left" className="w-[340px] overflow-y-auto p-0">
                <SheetHeader className="border-b">
                  <SheetTitle>Product Categories</SheetTitle>
                </SheetHeader>
                <Sidebar categories={sidebarCategories} />
              </SheetContent>
            </Sheet>
          </div>

          <CartTaxExemptionNotice />

          <h1 className="mb-5 text-[28px] font-bold uppercase leading-heading text-near-black sm:mb-6 sm:text-h2">
            Your Cart
          </h1>

          <CartPageContent />

          <IsoSection align="left" className="mt-auto pb-[18px] pt-10" />
        </main>
      </div>
    </div>
  );
}
