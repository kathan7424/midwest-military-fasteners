/**
 * File Name: HeaderCart.tsx
 * Description: Header cart button with hover dropdown preview and cart count.
 * Developer: Jaimin
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

"use client";

import Link from "next/link";
import { useState } from "react";

import CartDropdown from "./CartDropdown";
import { CART_COUNT } from "./cartData";

export default function HeaderCart() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative hidden lg:block mr-[5px]"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href="/cart"
        className="relative hidden lg:flex items-center gap-2 px-[16px] py-[11px] border border-amber rounded-none transition-colors shrink-0"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber text-link font-normal text-white">
          {CART_COUNT}
        </span>

        <span className="text-near-black text-link font-bold uppercase">
          Your Order
        </span>
      </Link>

      <div
        className={`absolute right-0 top-full transition-all duration-200  ${open ? "block" : "hidden"}`}
      >
        <CartDropdown />
      </div>
    </div>
  );
}