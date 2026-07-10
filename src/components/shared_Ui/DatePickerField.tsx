/**
 * File Name: DatePickerField.tsx
 * Description: Thin string↔DateValue bridge over the application DatePicker
 *   (html-dev UI). External interface is unchanged — consumers pass/receive
 *   plain YYYY-MM-DD strings; no functionality is affected.
 * Developer: KP-184
 * Created Date: 2026-07-09
 * Last Modified: 2026-07-10
 */

"use client";

import { parseDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";

import { DatePicker } from "@/components/application/date-picker/date-picker";

interface DatePickerFieldProps {
  /** Accessible name when no visible label is rendered. */
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  /** YYYY-MM-DD string — dates before this are disabled. */
  minValue?: string;
  /** Shown in the button trigger when no date is selected. */
  placeholder?: string;
  /** Optional className forwarded to the trigger Button. */
  buttonClassName?: string;
  // Kept for backward-compat with existing call sites; not rendered.
  label?: string;
  required?: boolean;
  error?: string;
  className?: string;
  groupClassName?: string;
}

function safe_parse(str: string): DateValue | null {
  if (!str) return null;
  try {
    return parseDate(str);
  } catch {
    return null;
  }
}

export default function DatePickerField({
  ariaLabel,
  value,
  onChange,
  minValue,
  placeholder = "Expiration Date",
  buttonClassName,
}: DatePickerFieldProps) {
  const parsedValue = safe_parse(value) ?? undefined;
  const parsedMin = minValue ? (safe_parse(minValue) ?? undefined) : undefined;

  return (
    <DatePicker
      aria-label={ariaLabel ?? "Date picker"}
      value={parsedValue}
      onChange={(date: DateValue | null) => onChange(date ? date.toString() : "")}
      minValue={parsedMin}
      placeholder={placeholder}
      buttonClassName={buttonClassName}
    />
  );
}
