/**
 * File Name: HeaderOrderButton.tsx
 * Description: Logged-in header cart / your order button.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import Link from "next/link";

import CartCountBadge from "@/components/shared_Ui/CartCountBadge";
import { cn } from "@/lib/utils";

interface HeaderOrderButtonProps {
  itemCount?: number;
  variant?: "full" | "compact";
  className?: string;
}

export default function HeaderOrderButton({
  itemCount = 0,
  variant = "full",
  className,
}: HeaderOrderButtonProps) {
  if (variant === "compact") {
    return (
      <Link
        href="/cart"
        aria-label={`Your order, ${itemCount} items`}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber bg-white transition-colors hover:bg-off-white",
          className
        )}
      >
        <CartCountBadge count={itemCount} size="md" />
      </Link>
    );
  }

  return (
    <Link
      href="/cart"
      className={cn(
        "hidden shrink-0 items-center gap-3 border border-amber bg-white px-4 py-2 transition-colors hover:bg-off-white lg:flex",
        className
      )}
    >
      <CartCountBadge count={itemCount} size="lg" />
      <span className="text-sm font-bold uppercase tracking-wide text-near-black">
        Your Order
      </span>
    </Link>
  );
}
