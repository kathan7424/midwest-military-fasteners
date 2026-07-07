/**
 * File Name: ToasterProvider.tsx
 * Description: Global toast notifications via Sonner (Untitled UI compatible).
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-07
 */

"use client";

import { Toaster } from "sonner";

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      closeButton
      gap={12}
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-none !border !border-light-gray !bg-white !shadow-[0_4px_12px_rgba(26,54,89,0.12)] !text-near-black font-sans",
          title: "!text-near-black !font-semibold !text-link",
          description: "!text-dark-gray !text-sm",
          actionButton:
            "!bg-blue !text-white !rounded-none hover:!bg-navy !font-semibold",
          cancelButton:
            "!bg-white !text-near-black !border !border-light-gray !rounded-none hover:!bg-off-white !font-semibold",
          closeButton:
            "!bg-white !text-mid-gray hover:!text-navy !border !border-light-gray !rounded-none",
          success: "!border-l-4 !border-l-blue",
          error: "!border-l-4 !border-l-amber",
          warning: "!border-l-4 !border-l-amber",
          info: "!border-l-4 !border-l-blue",
          loading: "!border-l-4 !border-l-blue",
        },
      }}
    />
  );
}
