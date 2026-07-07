/**
 * File Name: auth-classes.ts
 * Description: Shared Tailwind class strings for auth forms.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

import { cn } from "@/lib/utils";

export function authInputClass(hasError = false) {
  return cn(
    "h-12 w-full rounded border bg-white px-4 text-base text-near-black placeholder:text-mid-gray focus:border-blue focus:outline-none",
    hasError ? "border-red-500" : "border-light-gray"
  );
}

export function authDateInputClass(hasError = false) {
  return cn(
    authInputClass(hasError),
    "cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
  );
}

export const authSubmitClass =
  "inline-flex min-w-[200px] items-center justify-center gap-2 rounded bg-amber px-8 py-3.5 text-base font-extrabold tracking-wide text-white transition-colors hover:bg-[#b38600] disabled:cursor-not-allowed disabled:opacity-65";

export const authUploadBtnClass =
  "inline-flex h-12 shrink-0 items-center gap-2 bg-blue px-5 text-sm font-bold tracking-wide text-white transition-colors hover:bg-navy";

export const authErrorClass = "text-sm text-red-600";
