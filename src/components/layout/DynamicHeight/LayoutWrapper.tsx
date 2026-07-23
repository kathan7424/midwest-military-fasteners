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
    const updateLayoutMeasurements = () => {
      const header = document.querySelector("header");
      const footer = document.querySelector("footer");
      const main = document.querySelector("main");

      if (!header || !footer) return;

      const headerHeight = header.getBoundingClientRect().height;
      const footerHeight = footer.getBoundingClientRect().height;

      // Store CSS variables
      document.documentElement.style.setProperty(
        "--header-height",
        `${headerHeight}px`
      );

      document.documentElement.style.setProperty(
        "--footer-height",
        `${footerHeight}px`
      );

      document.documentElement.style.setProperty(
        "--available-height",
        `calc(100vh - ${headerHeight}px - ${footerHeight}px)`
      );

      // Optional: Apply directly to <main>
      // if (main) {
      //   main.style.minHeight = `calc(100vh - ${headerHeight}px - ${footerHeight}px)`;
      // }
    };

    updateLayoutMeasurements();

    const observer = new ResizeObserver(updateLayoutMeasurements);

    const header = document.querySelector("header");
    const footer = document.querySelector("footer");

    if (header) observer.observe(header);
    if (footer) observer.observe(footer);

    window.addEventListener("resize", updateLayoutMeasurements);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateLayoutMeasurements);
    };
  }, []);

  return <>{children}</>;
}