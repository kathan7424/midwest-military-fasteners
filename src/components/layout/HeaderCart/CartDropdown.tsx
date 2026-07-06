/**
 * File Name: CartDropdown.tsx
 * Description: Dropdown preview for cart items shown on header hover.
 * Developer: Jaimin
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

"use client";

import Link from "next/link";
import { X } from "lucide-react";

import { CART_ITEMS } from "./cartData";

export default function CartDropdown() {
  return (
    <div className="absolute right-0 top-full z-50 w-[512px]">
         {/* Connector between button and dropdown */}
      <div className="h-[23px] w-[170.2px] bg-white mt-[-1px] relative z-[1] ml-auto border-l-1 border-r-1 border-amber" />
      <div className="p-4 border border-amber bg-white shadow-xl mt-[-1px]">
        <div className="divide-y divide-light-gray">
          {CART_ITEMS.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2.5 text-link"
            >
              <Link
                href={`/product/${item.partNumber}`}
                className="w-44 text-blue hover:underline"
              >
                {item.partNumber}
              </Link>

              <div className="flex items-center gap-1.5 text-dark-gray">
                <span>QTY</span>
                <span className="text-near-black">{item.qty}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-mid-gray">Price</span>

                <span className="text-near-black">
                  {item.price}
                </span>

                <button className="ml-2.5">
                  <X
                    size={20}
                    className="text-red-500 hover:text-red-600"
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 xl:mt-[28px] gap-4 flex items-center justify-between">
          <Link
            href="/cart"
            className="flex items-center gap-2 text-link text-blue hover:text-amber transition-colors"
          >
            <svg className="w-[18px] h-auto" width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M0 0H3.17188C3.22656 0.328125 3.30859 0.765625 3.41797 1.3125H15.75C15.7227 1.44922 15.2852 3.80078 14.4375 8.3125H4.67578L4.92188 9.625H13.5625V10.9375H3.82812L3.71875 10.3906L2.07812 1.3125H0V0ZM4.45703 7H13.3438L14.1641 2.625H3.66406L4.45703 7ZM5.6875 11.8125C6.42578 11.8125 7 12.3867 7 13.125C7 13.8633 6.42578 14.4375 5.6875 14.4375C4.94922 14.4375 4.375 13.8633 4.375 13.125C4.375 12.3867 4.94922 11.8125 5.6875 11.8125ZM11.8125 11.8125C12.5508 11.8125 13.125 12.3867 13.125 13.125C13.125 13.8633 12.5508 14.4375 11.8125 14.4375C11.0742 14.4375 10.5 13.8633 10.5 13.125C10.5 12.3867 11.0742 11.8125 11.8125 11.8125Z" fill="currentColor"/> </svg>
            View Cart
          </Link>

          <Link
            href="/checkout"
            className="flex items-center gap-2.5 bg-amber px-5 py-3 font-semibold uppercase text-link text-white hover:bg-blue transition-colors"
          >
            Checkout
            <svg className="w-[9px] h-auto" width="7" height="11" viewBox="0 0 7 11" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M6.20703 5.30469L5.74219 5.76953L1.36719 10.1445L0.902344 10.6094L0 9.67969L0.464844 9.21484L4.375 5.30469L0.464844 1.39453L0 0.929688L0.902344 0L1.36719 0.464844L5.74219 4.83984L6.20703 5.30469Z" fill="white"/> </svg> 
          </Link>
        </div>
      </div>
    </div>
  );
}