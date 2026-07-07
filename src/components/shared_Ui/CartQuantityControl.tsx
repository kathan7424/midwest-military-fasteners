/**
 * File Name: CartQuantityControl.tsx
 * Description: Cart quantity stepper with editable input and +/- buttons.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface CartQuantityControlProps {
  quantity: number;
  minQuantity?: number;
  maxQuantity?: number;
  editable?: boolean;
  disabled?: boolean;
  isUpdating?: boolean;
  size?: "sm" | "lg";
  className?: string;
  onChange: (quantity: number) => void | Promise<void>;
}

function clampQuantity(
  value: number,
  minQuantity: number,
  maxQuantity?: number
): number {
  const normalized = Math.max(minQuantity, Number(value) || minQuantity);

  if (maxQuantity && maxQuantity > 0) {
    return Math.min(normalized, maxQuantity);
  }

  return normalized;
}

export default function CartQuantityControl({
  quantity,
  minQuantity = 1,
  maxQuantity,
  editable = true,
  disabled = false,
  isUpdating = false,
  size = "sm",
  className,
  onChange,
}: CartQuantityControlProps) {
  const [inputValue, setInputValue] = useState(String(quantity));
  const isLarge = size === "lg";
  const hasMaxLimit = Boolean(maxQuantity && maxQuantity > 0);
  const isAtMax = hasMaxLimit && quantity >= (maxQuantity ?? 0);
  const isAtMin = quantity <= minQuantity;
  const isLocked = disabled || isUpdating;

  useEffect(() => {
    setInputValue(String(quantity));
  }, [quantity]);

  if (!editable) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center border border-[#989898] bg-off-white text-near-black",
          isLarge ? "h-[43px] min-w-[118px] px-4 text-[20px]" : "h-8 min-w-10 px-2 text-sm",
          className
        )}
      >
        {quantity}
      </span>
    );
  }

  const commitQuantity = () => {
    if (isLocked) {
      setInputValue(String(quantity));
      return;
    }

    const parsed = clampQuantity(Number(inputValue), minQuantity, maxQuantity);

    setInputValue(String(parsed));

    if (parsed !== quantity) {
      void onChange(parsed);
    }
  };

  const handleDecrease = () => {
    if (isAtMin || isLocked) {
      return;
    }

    const nextQuantity = quantity - 1;
    setInputValue(String(nextQuantity));
    void onChange(nextQuantity);
  };

  const handleIncrease = () => {
    if (isLocked || isAtMax) {
      return;
    }

    const nextQuantity = clampQuantity(quantity + 1, minQuantity, maxQuantity);
    setInputValue(String(nextQuantity));
    void onChange(nextQuantity);
  };

  return (
    <div
      className={cn(
        "inline-flex overflow-hidden border border-[#989898] bg-white",
        isLarge ? "h-[43px] w-[118px]" : "h-8",
        (isLocked || disabled) && "opacity-80",
        className
      )}
    >
      <button
        type="button"
        aria-disabled={isAtMin || isLocked}
        aria-label="Decrease quantity"
        onClick={handleDecrease}
        className={cn(
          "flex items-center justify-center border-r border-light-gray text-near-black transition-opacity",
          isLarge ? "w-[36px] text-[20px]" : "w-8 text-lg",
          isAtMin || isLocked
            ? "cursor-default opacity-40"
            : "hover:bg-off-white"
        )}
      >
        -
      </button>

      <input
        type="number"
        min={minQuantity}
        max={hasMaxLimit ? maxQuantity : undefined}
        value={inputValue}
        readOnly={isLocked}
        disabled={disabled}
        aria-label="Quantity"
        aria-busy={isUpdating}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={commitQuantity}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className={cn(
          "w-full min-w-0 border-0 bg-white text-center text-near-black outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          isLarge ? "text-[20px]" : "text-sm",
          isLarge ? "flex-1" : "w-10 px-1",
          disabled && "cursor-not-allowed bg-off-white"
        )}
      />

      <button
        type="button"
        aria-disabled={isAtMax || isLocked}
        aria-label="Increase quantity"
        onClick={handleIncrease}
        className={cn(
          "flex items-center justify-center border-l border-light-gray text-near-black transition-opacity",
          isLarge ? "w-[36px] text-[20px]" : "w-8 text-lg",
          isAtMax || isLocked
            ? "cursor-default opacity-40"
            : "hover:bg-off-white"
        )}
      >
        +
      </button>
    </div>
  );
}
