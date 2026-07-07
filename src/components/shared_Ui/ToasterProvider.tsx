/**
 * File Name: ToasterProvider.tsx
 * Description: Global toast notifications provider.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

"use client";

import { Toaster } from "react-hot-toast";

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3500,
        style: {
          fontSize: "14px",
          fontWeight: 600,
          borderRadius: "4px",
          padding: "12px 16px",
        },
        success: {
          style: {
            background: "#1f4f82",
            color: "#ffffff",
          },
          iconTheme: {
            primary: "#ffffff",
            secondary: "#1f4f82",
          },
        },
        error: {
          style: {
            background: "#b42318",
            color: "#ffffff",
          },
          iconTheme: {
            primary: "#ffffff",
            secondary: "#b42318",
          },
        },
      }}
    />
  );
}
