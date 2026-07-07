/**
 * File Name: CartPage.tsx
 * Description: Static View Cart page
 * Developer: jaimin
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import Image from "next/image";
import { Filter } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar/Sidebar";
import Breadcrumb from "@/components/shared_Ui/Breadcrumb";
import IsoSection from "@/components/shared_Ui/IsoSection";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";


export default function CartPage() {

const breadcrumb = [
    { label: "SCREWS", href: "#" },
    { label: "HEX CAP SCREWS", href: "#" },
    { label: "MS35307" },
];

  return (
    <div className="mx-auto w-full px-4 py-6 xl:px-5 xl:py-[30px] relative test">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden w-[300px] shrink-0 lg:block">
          {/* <Breadcrumb items={breadcrumb} className="mb-5" /> */}
          <Sidebar activeGroupId="hex-cap-screws" activeSeriesId="ms35307" />
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

                <Sidebar activeGroupId="hex-cap-screws" activeSeriesId="ms35307" />
              </SheetContent>
            </Sheet>
          </div>

          {/* Title + description */}
          {/* Cart Notice */}
            <div className="max-w-[805px] mb-[30px] gap-5 flex items-center justify-between border-l-4 border-amber bg-[#eef6fb] px-5 py-4 text-link text-black">
                <p className="mb-0">Your sales tax exemption document is about to expire.</p>
                <button className="flex items-center gap-2.5 text-link text-blue hover:text-amber transition-colors">
                    <svg width="12" height="17" viewBox="0 0 12 17" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M6.53125 0.28125L10.7812 4.53125C11.0625 4.8125 11.0625 5.3125 10.7812 5.59375C10.5 5.875 10 5.875 9.71875 5.59375L6.75 2.625V11.3125C6.75 11.7188 6.40625 12.0625 6 12.0625C5.59375 12.0625 5.25 11.7188 5.25 11.3125V2.625L2.28125 5.59375C2 5.875 1.5 5.875 1.21875 5.59375C0.9375 5.3125 0.9375 4.8125 1.21875 4.53125L5.46875 0.28125C5.75 0 6.25 0 6.53125 0.28125ZM0.75 14.5625H11.25C11.6562 14.5625 12 14.9062 12 15.3125C12 15.7188 11.6562 16.0625 11.25 16.0625H0.75C0.34375 16.0625 0 15.7188 0 15.3125C0 14.9062 0.34375 14.5625 0.75 14.5625Z" fill="currentColor"/> </svg>
                    Upload a new document
                </button>
            </div>

            {/* Page Title */}
            <h1 className="mb-6 text-h2 font-bold uppercase text-near-black">
            Your Cart
            </h1>

            <div className="max-w-[1320px]">
                {/* Cart Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                        <tr className="bg-navy text-left text-link font-bold uppercase text-white">
                            <th className="px-5 py-4">Part #</th>
                            <th className="px-5 py-4">Description</th>
                            <th className="px-5 py-4 text-center">Qty</th>
                            <th className="px-5 py-4"></th>
                            <th className="px-5 py-4"></th>
                        </tr>
                        </thead>

                        <tbody className="divide-y divide-light-gray border-b border-light-gray">

                        <tr>
                            <td className="px-5 py-2.5 text-link text-blue">
                            MS35307-303
                            </td>

                            <td className="px-5 py-2.5">
                            1/4-20 X ½ HEX CAP SCREW STAINLESS STEEL
                            </td>

                            <td className="px-5 py-2.5 text-center">
                                <div className="inline-flex h-[43px] w-[118px] overflow-hidden border border-[#989898] bg-white">
                                    <span className="flex w-[54px] items-center justify-center text-[16px] text-[#C9C9C9]"> QTY </span>
                                    <input type="number" defaultValue={2} min={1} className="w-[64px] border-0 bg-transparent text-center text-[20px] text-near-black outline-none" />
                                </div>
                            </td>

                            <td className="px-5 py-2.5 whitespace-nowrap">
                            $115.56
                            </td>

                            <td className="px-5 py-2.5 text-center text-[#E12222] text-2xl cursor-pointer">
                            ×
                            </td>
                        </tr>

                        <tr>
                            <td className="px-5 py-2.5 text-link text-blue">
                            MS35307-303
                            </td>

                            <td className="px-5 py-2.5">
                            1/4-20 X ½ HEX CAP SCREW STAINLESS STEEL
                            </td>

                        <td className="px-5 py-2.5 text-center">
                                <div className="inline-flex h-[43px] w-[118px] overflow-hidden border border-[#989898] bg-white">
                                    <span className="flex w-[54px] items-center justify-center text-[16px] text-[#C9C9C9]"> QTY </span>
                                    <input type="number" defaultValue={2} min={1} className="w-[64px] border-0 bg-transparent text-center text-[20px] text-near-black outline-none" />
                                </div>
                            </td>

                            <td className="px-5 py-2.5 whitespace-nowrap">
                            $115.56
                            </td>

                            <td className="px-5 py-2.5 text-center text-[#E12222] text-2xl cursor-pointer">
                            ×
                            </td>
                        </tr>

                        <tr>
                            <td className="px-5 py-2.5 text-link text-blue">
                            MS35307-303
                            </td>

                            <td className="px-5 py-2.5">
                            1/4-20 X ½ HEX CAP SCREW STAINLESS STEEL
                            </td>

                            <td className="px-5 py-2.5 text-center">
                                <div className="inline-flex h-[43px] w-[118px] overflow-hidden border border-[#989898] bg-white">
                                    <span className="flex w-[54px] items-center justify-center text-[16px] text-[#C9C9C9]"> QTY </span>
                                    <input type="number" defaultValue={2} min={1} className="w-[64px] border-0 bg-transparent text-center text-[20px] text-near-black outline-none" />
                                </div>
                            </td>

                            <td className="px-5 py-2.5 whitespace-nowrap">
                            $115.56
                            </td>

                            <td className="px-5 py-2.5 text-center text-[#E12222] text-2xl cursor-pointer">
                            ×
                            </td>
                        </tr>

                        </tbody>
                    </table>
                </div>

                {/* Checkout */}
                <div className="mt-8 flex justify-end">
                    <button className="flex items-center gap-2.5 bg-amber px-5 py-3 font-semibold uppercase text-link text-white hover:bg-blue transition-colors">
                        Checkout
                        <svg className="w-[9px] h-auto" width="7" height="11" viewBox="0 0 7 11" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M6.20703 5.30469L5.74219 5.76953L1.36719 10.1445L0.902344 10.6094L0 9.67969L0.464844 9.21484L4.375 5.30469L0.464844 1.39453L0 0.929688L0.902344 0L1.36719 0.464844L5.74219 4.83984L6.20703 5.30469Z" fill="white"/> </svg>
                    </button>
                </div>
            </div>

          {/* ISO */}
          <IsoSection align="left" className="mt-auto pb-[18px]" />
        </main>
      </div>
    </div>
  );
}
