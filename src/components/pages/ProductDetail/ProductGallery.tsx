/**
 * File Name: ProductGallery.tsx
 * Description: Product image gallery — large active image + clickable thumbnails.
 *   When only one image is available the thumbnails strip is hidden.
 *   Uses ProductImage for consistent placeholder / error handling.
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

"use client";

import { useState } from "react";

import ProductImage from "@/components/shared_Ui/ProductImage";

interface ProductGalleryProps {
  image?: string;
  gallery?: string[];
  alt: string;
}

export default function ProductGallery({
  image,
  gallery = [],
  alt,
}: ProductGalleryProps) {
  // Deduplicate: main image first, then gallery extras.
  const allImages = Array.from(
    new Set([image, ...gallery].filter((u): u is string => Boolean(u)))
  );

  const [active, setActive] = useState<string>(allImages[0] ?? "");
  const hasMultiple = allImages.length > 1;

  return (
    <div>
      {/* Main image */}
      <ProductImage
        src={active || image}
        alt={alt}
        fill
        containerClassName="h-[140px] w-[280px] xl:h-[199px] xl:w-[298px]"
        priority
      />

      {/* Thumbnail strip — only rendered when product has 2+ images */}
      {hasMultiple ? (
        <div
          className="mt-3 flex flex-wrap gap-2"
          style={{ maxWidth: "298px" }}
          role="list"
          aria-label="Product images"
        >
          {allImages.map((img, index) => (
            <button
              key={img}
              type="button"
              role="listitem"
              onClick={() => setActive(img)}
              aria-label={`View image ${index + 1}`}
              aria-pressed={active === img}
              className={[
                "relative h-14 w-14 shrink-0 border-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue",
                active === img
                  ? "border-amber"
                  : "border-light-gray hover:border-blue",
              ].join(" ")}
            >
              <ProductImage
                src={img}
                alt={`${alt} — image ${index + 1}`}
                fill
                containerClassName="h-full w-full"
                sizes="56px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
