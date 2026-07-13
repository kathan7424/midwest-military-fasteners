/**
 * File Name: ProductGallery.tsx
 * Description: Product image gallery - WooCommerce-style.
 *   Hover over main image -> side-by-side magnifier: a lens tracks the cursor
 *   on the image and a zoom pane beside it shows the magnified region.
 *   Click main image -> lightbox with full-size view + prev/next nav.
 *   Thumbnail strip shown when product has 2+ images.
 * Developer: KP-184
 * Created Date: 2026-07-09
 * Last Modified: 2026-07-13
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

import {
  PRODUCT_PLACEHOLDER_IMAGE,
  resolve_product_image_url,
} from "@/utils/product-image.utils";

interface ProductGalleryProps {
  image?: string;
  gallery?: string[];
  alt: string;
}

const ZOOM_SCALE = 2.5;

export default function ProductGallery({
  image,
  gallery = [],
  alt,
}: ProductGalleryProps) {
  const allImages = Array.from(
    new Set([image, ...gallery].filter((u): u is string => Boolean(u)))
  ).map((u) => resolve_product_image_url(u));

  const [active, setActive] = useState<string>(
    allImages[0] ?? PRODUCT_PLACEHOLDER_IMAGE
  );
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  // When the main image errors out (active -> placeholder), track it so the
  // lightbox uses the same corrected src instead of the original broken URL.
  const [lbError, setLbError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasMultiple = allImages.length > 1;

  // -- Zoom -------------------------------------------------------
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setZoomPos({
        x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => setZoomPos(null), []);

  // -- Lightbox ---------------------------------------------------
  const openLightbox = useCallback(() => {
    const idx = allImages.indexOf(active);
    setLightboxIdx(idx >= 0 ? idx : 0);
    setLbError(false);
    setLightbox(true);
  }, [active, allImages]);

  const closeLightbox = useCallback(() => setLightbox(false), []);

  const lightboxPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setLbError(false);
      setLightboxIdx((i) => (i - 1 + allImages.length) % allImages.length);
    },
    [allImages.length]
  );

  const lightboxNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setLbError(false);
      setLightboxIdx((i) => (i + 1) % allImages.length);
    },
    [allImages.length]
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft" && hasMultiple) {
        setLbError(false);
        setLightboxIdx((i) => (i - 1 + allImages.length) % allImages.length);
      }
      if (e.key === "ArrowRight" && hasMultiple) {
        setLbError(false);
        setLightboxIdx((i) => (i + 1) % allImages.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, hasMultiple, allImages.length, closeLightbox]);

  // Use active (already error-corrected) when the original URL failed to load.
  const lightboxSrc = lbError
    ? PRODUCT_PLACEHOLDER_IMAGE
    : (allImages[lightboxIdx] ?? PRODUCT_PLACEHOLDER_IMAGE);

  return (
    <>
      <div className="relative">
        {/* -- Main image + magnifier lens ------------------------- */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={openLightbox}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && openLightbox()}
          aria-label="Zoom / enlarge image"
          className="group relative h-[199px] w-[298px] cursor-zoom-in overflow-hidden border border-light-gray bg-white xl:h-[240px] xl:w-[360px]"
        >
          <Image
            src={active}
            alt={alt}
            fill
            className="object-contain"
            priority
            sizes="(min-width: 1280px) 360px, 298px"
            onError={() => setActive(PRODUCT_PLACEHOLDER_IMAGE)}
          />

          {/* Magnifier lens — marks the region shown in the zoom pane.
              left/top mirror the transform-origin window math of the pane:
              at origin (x%, y%) and scale s, the visible window starts at
              x*(1 - 1/s)% and spans 100/s%. */}
          {zoomPos ? (
            <span
              className="pointer-events-none absolute hidden border border-white bg-white/25 shadow-[0_0_0_1px_rgba(0,0,0,0.2)] lg:block"
              style={{
                left: `${zoomPos.x * (1 - 1 / ZOOM_SCALE)}%`,
                top: `${zoomPos.y * (1 - 1 / ZOOM_SCALE)}%`,
                width: `${100 / ZOOM_SCALE}%`,
                height: `${100 / ZOOM_SCALE}%`,
              }}
              aria-hidden="true"
            />
          ) : null}

          {/* Zoom icon hint (shown on hover, hidden while zooming) */}
          <span
            className={[
              "pointer-events-none absolute bottom-2 right-2 rounded bg-white/90 p-1 shadow-sm transition-opacity",
              zoomPos ? "opacity-0" : "opacity-0 group-hover:opacity-100",
            ].join(" ")}
            aria-hidden="true"
          >
            <ZoomIn className="h-4 w-4 text-mid-gray" />
          </span>
        </div>

        {/* -- Side-by-side zoom pane (desktop only) --------------- */}
        {zoomPos ? (
          <div
            className="pointer-events-none absolute left-full top-0 z-20 ml-4 hidden h-[300px] w-[450px] overflow-hidden border border-light-gray bg-white shadow-lg lg:block"
            aria-hidden="true"
          >
            <div
              className="absolute inset-0"
              style={{
                transform: `scale(${ZOOM_SCALE})`,
                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
              }}
            >
              <Image
                src={active}
                alt=""
                fill
                className="object-contain"
                sizes="450px"
              />
            </div>
          </div>
        ) : null}

        {/* -- Thumbnail strip ------------------------------------ */}
        {hasMultiple ? (
          <div
            className="mt-3 flex max-w-[298px] flex-wrap gap-2 xl:max-w-[360px]"
            role="group"
            aria-label="Product images"
          >
            {allImages.map((img, index) => (
              <button
                key={img}
                type="button"
                onClick={() => setActive(img)}
                aria-label={`View image ${index + 1}`}
                aria-pressed={active === img}
                className={[
                  "relative h-14 w-14 shrink-0 overflow-hidden border-2 bg-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue",
                  active === img
                    ? "border-amber"
                    : "border-light-gray hover:border-blue",
                ].join(" ")}
              >
                <Image
                  src={img}
                  alt={`${alt} - image ${index + 1}`}
                  fill
                  className="object-contain"
                  sizes="56px"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* -- Lightbox modal --------------------------------------- */}
      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          {/* Close */}
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Prev */}
          {hasMultiple ? (
            <button
              type="button"
              onClick={lightboxPrev}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : null}

          {/* Image */}
          <div
            className="relative mx-20 max-h-[90vh] max-w-[90vw] h-[600px] w-[800px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightboxSrc}
              alt={alt}
              fill
              className="object-contain"
              sizes="90vw"
              onError={() => setLbError(true)}
            />
          </div>

          {/* Next */}
          {hasMultiple ? (
            <button
              type="button"
              onClick={lightboxNext}
              aria-label="Next image"
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          ) : null}

          {/* Dot indicators */}
          {hasMultiple ? (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLbError(false);
                    setLightboxIdx(i);
                  }}
                  aria-label={`Go to image ${i + 1}`}
                  className={[
                    "h-2 rounded-full transition-all",
                    i === lightboxIdx
                      ? "w-6 bg-white"
                      : "w-2 bg-white/40 hover:bg-white/70",
                  ].join(" ")}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
