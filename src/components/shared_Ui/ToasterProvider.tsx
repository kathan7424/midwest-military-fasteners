/**
 * File Name: ToasterProvider.tsx
 * Description: Global toast notifications via Sonner, styled after
 *              WooCommerce notice types (success / error / info).
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-08
 */

"use client";

import { Toaster } from "sonner";

/** WooCommerce core notice colors. */
const WC_GREEN = "#8fae1b";
const WC_RED = "#b81c23";
const WC_BLUE = "#1e85be";
const WC_AMBER = "#dd9933";

function NoticeIcon({ color, glyph }: { color: string; glyph: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {glyph}
    </span>
  );
}

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      closeButton
      gap={12}
      icons={{
        success: <NoticeIcon color={WC_GREEN} glyph="✓" />,
        error: <NoticeIcon color={WC_RED} glyph="✕" />,
        warning: <NoticeIcon color={WC_AMBER} glyph="!" />,
        info: <NoticeIcon color={WC_BLUE} glyph="i" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast !w-[460px] !max-w-[calc(100vw-32px)] !rounded-none !border !border-light-gray !bg-[#f7f6f7] !shadow-[0_4px_12px_rgba(26,54,89,0.12)] !text-[#515151] font-sans",
          title: "!text-[#515151] !font-semibold !text-link",
          description: "!text-dark-gray !text-sm",
          actionButton:
            "!bg-amber !text-white !rounded-none hover:!opacity-90 !font-bold !uppercase",
          cancelButton:
            "!bg-white !text-near-black !border !border-light-gray !rounded-none hover:!bg-off-white !font-semibold",
          closeButton:
            "!bg-white !text-mid-gray hover:!text-navy !border !border-light-gray !rounded-none",
          success: "!border-t-[3px] !border-t-[#8fae1b]",
          error: "!border-t-[3px] !border-t-[#b81c23]",
          warning: "!border-t-[3px] !border-t-[#dd9933]",
          info: "!border-t-[3px] !border-t-[#1e85be]",
          loading: "!border-t-[3px] !border-t-[#1e85be]",
        },
      }}
    />
  );
}
