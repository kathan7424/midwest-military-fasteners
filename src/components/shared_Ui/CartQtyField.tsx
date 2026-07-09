/**
 * File Name: CartQtyField.tsx
 * Description: Figma cart qty — grey "QTY" label + number input with native steppers.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface CartQtyFieldProps {
  quantity: number;
  minQuantity?: number;
  maxQuantity?: number;
  editable?: boolean;
  disabled?: boolean;
  isUpdating?: boolean;
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

export default function CartQtyField({
  quantity,
  minQuantity = 1,
  maxQuantity,
  editable = true,
  disabled = false,
  isUpdating = false,
  className,
  onChange,
}: CartQtyFieldProps) {
  const [inputValue, setInputValue] = useState(String(quantity));
  const [prevQuantity, setPrevQuantity] = useState(quantity);
  const hasMaxLimit = Boolean(maxQuantity && maxQuantity > 0);
  const isLocked = disabled || isUpdating || !editable;

  // Sync the store quantity into the local input when it changes
  // (adjust state during render instead of an effect).
  if (prevQuantity !== quantity) {
    setPrevQuantity(quantity);
    setInputValue(String(quantity));
  }

  const applyQuantity = (rawValue: string, commit_empty = false) => {
    if (isLocked) {
      setInputValue(String(quantity));
      return;
    }

    if (rawValue.trim() === "") {
      if (commit_empty) {
        setInputValue(String(quantity));
      }
      return;
    }

    const parsed = clampQuantity(Number(rawValue), minQuantity, maxQuantity);
    setInputValue(String(parsed));

    if (parsed !== quantity) {
      void onChange(parsed);
    }
  };

  if (!editable) {
    return (
      <div
        className={cn(
          "inline-flex h-[43px] w-[118px] overflow-hidden border border-[#989898] bg-white",
          className
        )}
      >
        <span className="flex w-[54px] shrink-0 items-center justify-center text-[16px] text-[#C9C9C9]">
          QTY
        </span>
        <span className="flex w-[64px] items-center justify-center text-[20px] text-near-black">
          {quantity}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex h-[43px] w-[118px] overflow-hidden border border-[#989898] bg-white",
        isLocked && "opacity-80",
        className
      )}
    >
      <span className="flex w-[54px] shrink-0 items-center justify-center text-[16px] text-[#C9C9C9]">
        QTY
      </span>
      <input
        type="number"
        min={minQuantity}
        max={hasMaxLimit ? maxQuantity : undefined}
        step={1}
        value={inputValue}
        readOnly={isLocked}
        disabled={disabled}
        aria-label="Quantity"
        aria-busy={isUpdating}
        onChange={(event) => applyQuantity(event.target.value)}
        onBlur={(event) => applyQuantity(event.target.value, true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-full w-[64px] shrink-0 border-0 bg-transparent px-1 text-center text-[20px] text-near-black outline-none disabled:cursor-not-allowed disabled:bg-off-white"
      />
    </div>
  );
}
