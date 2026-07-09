/**
 * File Name: ProductImage.tsx
 * Description: Product image with automatic placeholder fallback.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import {
  is_product_placeholder_image,
  is_valid_product_image_url,
  PRODUCT_PLACEHOLDER_IMAGE,
  resolve_product_image_url,
} from "@/utils/product-image.utils";
import { normalize_media_url } from "@/utils/url.utils";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  containerClassName?: string;
  sizes?: string;
  priority?: boolean;
  /** When true, keeps valid absolute category thumbnails without product placeholder logic. */
  categoryImage?: boolean;
}

function resolve_image_src(
  src?: string | null,
  categoryImage = false
): string {
  if (categoryImage) {
    const normalized = normalize_media_url(src);

    if (is_valid_product_image_url(normalized)) {
      return normalized!;
    }

    return PRODUCT_PLACEHOLDER_IMAGE;
  }

  return resolve_product_image_url(src);
}

export default function ProductImage({
  src,
  alt,
  fill = false,
  width,
  height,
  className,
  containerClassName,
  sizes,
  priority = false,
  categoryImage = false,
}: ProductImageProps) {
  const [resolved_src, set_resolved_src] = useState(() =>
    resolve_image_src(src, categoryImage)
  );
  const [prev_src, set_prev_src] = useState(src);
  const [prev_category_image, set_prev_category_image] = useState(categoryImage);

  // Re-resolve when the source props change (adjust state during render
  // instead of an effect) while keeping the onError placeholder fallback.
  if (prev_src !== src || prev_category_image !== categoryImage) {
    set_prev_src(src);
    set_prev_category_image(categoryImage);
    set_resolved_src(resolve_image_src(src, categoryImage));
  }

  const is_placeholder = is_product_placeholder_image(resolved_src);

  const image_class = cn(
    "object-contain",
    is_placeholder && "opacity-70",
    className
  );

  const handle_error = () => {
    set_resolved_src(PRODUCT_PLACEHOLDER_IMAGE);
  };

  if (fill) {
    return (
      <div className={cn("relative", containerClassName)}>
        <Image
          src={resolved_src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={image_class}
          onError={handle_error}
        />
      </div>
    );
  }

  return (
    <Image
      src={resolved_src}
      alt={alt}
      width={width ?? 298}
      height={height ?? 199}
      sizes={sizes}
      priority={priority}
      className={cn(image_class, containerClassName)}
      onError={handle_error}
    />
  );
}
