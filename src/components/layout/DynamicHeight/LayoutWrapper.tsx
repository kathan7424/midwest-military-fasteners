/**
 * File Name: LayoutWrapper.tsx
 * Description: 
 * Developer: KP-184
 * Created Date: 2026-07-21
 * Last Modified: 2026-07-21
 */

"use client";

import { useEffect } from "react";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {

  useEffect(() => {
    const updateHeight = () => {
      const header = document.querySelector("header");
      const footer = document.querySelector("footer");

      const headerHeight = header?.offsetHeight || 0;
      const footerHeight = footer?.offsetHeight || 0;

      const availableHeight =
        window.innerHeight - headerHeight - footerHeight;

      document.documentElement.style.setProperty(
        "--available-height",
        `${availableHeight}px`
      );
    };

    updateHeight();

    window.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  return children;
}