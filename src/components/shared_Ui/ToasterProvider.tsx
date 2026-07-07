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
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "font-sans text-sm font-semibold shadow-md",
          success: "border-blue/20",
          error: "border-red-200",
        },
      }}
    />
  );
}
