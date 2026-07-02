/**
 * File Name: QtyAddToOrder.tsx
 * Description: Shared QTY input + "Add to Order" button. Presentational only —
 *              order/cart logic is added by the backend developer later.
 *              `size="sm"` for table rows, `size="lg"` for the detail page.
 * Developer: pod2
 * Created Date: 2026-07-01
 * Last Modified: 2026-07-01
 */

import { cn } from "@/lib/utils";

interface QtyAddToOrderProps {
  size?: "sm" | "lg";
  className?: string;
}

export default function QtyAddToOrder({
  size = "sm",
  className,
}: QtyAddToOrderProps) {
  const isLg = size === "lg";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <input
        type="number"
        min={1}
        placeholder="QTY"
        aria-label="Quantity"
        className={cn(
          "text-near-black placeholder:text-mid-gray",
          isLg
            ? "h-[47px] w-[115px] border-2 border-[#4F5965] px-3 text-[20px]"
            : "w-16 border border-light-gray px-2 py-1.5 text-sm"
        )}
      />
      <button
        type="button"
        className={cn(
          "bg-amber font-bold uppercase text-white transition-opacity hover:opacity-90",
          isLg ? "h-[47px] px-6 font-condensed text-[20px]" : "px-3 py-2 text-xs"
        )}
      >
        Add to Order
      </button>
    </div>
  );
}
