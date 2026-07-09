/**
 * File Name: CartCountBadge.tsx
 * Description: Adaptive cart count pill — scales for 2–3+ digit quantities.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { cn } from "@/lib/utils";

interface CartCountBadgeProps {
  count: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function get_digit_count(count: number): number {
  return String(Math.max(0, count)).length;
}

function get_badge_classes(count: number, size: "sm" | "md" | "lg"): string {
  const digits = get_digit_count(count);

  const height =
    size === "sm" ? "h-5 min-w-5" : size === "lg" ? "h-7 min-w-7" : "h-6 min-w-6";

  let text = "text-xs";
  let padding = "px-0";

  if (digits >= 4) {
    text = size === "sm" ? "text-[8px]" : "text-[9px]";
    padding = "px-1";
  } else if (digits === 3) {
    text = size === "sm" ? "text-[9px]" : size === "lg" ? "text-[11px]" : "text-[10px]";
    padding = "px-1";
  } else if (digits === 2) {
    text = size === "sm" ? "text-[10px]" : size === "lg" ? "text-xs" : "text-xs";
    padding = "px-1";
  } else if (size === "lg") {
    text = "text-sm";
  }

  return cn(height, text, padding);
}

export default function CartCountBadge({
  count,
  size = "md",
  className,
}: CartCountBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-amber font-bold leading-none text-white tabular-nums",
        get_badge_classes(count, size),
        className
      )}
    >
      {count}
    </span>
  );
}
