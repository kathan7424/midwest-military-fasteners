/**
 * File Name: IsoSection.tsx
 * Description: Shared ISO trust block — logo + content from WP footer settings
 *              (same API source as the Footer). Renders nothing when the API
 *              provides no content. Reused across product / cart pages.
 * Developer: pod2
 * Created Date: 2026-07-01
 * Last Modified: 2026-07-08
 */

"use client";

import Image from "next/image";
import Link from "next/link";

import { useSiteConfig } from "@/components/providers/SiteConfigProvider";
import { cn } from "@/lib/utils";

interface IsoSectionProps {
  /** Horizontal alignment of the logo + text group on desktop. Default: "center". */
  align?: "left" | "center";
  className?: string;
}

export default function IsoSection({
  align = "center",
  className,
}: IsoSectionProps) {
  const { isoSection } = useSiteConfig();

  const hasLogo = Boolean(isoSection?.logo?.url);
  const hasContent = Boolean(isoSection?.contentHtml);

  if (!hasLogo && !hasContent) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-8 py-12 md:flex-row md:items-center md:gap-10",
        align === "center" ? "md:justify-center" : "md:justify-start",
        className
      )}
    >
      {hasLogo ? (
        <Link href="/" prefetch={false} className="block shrink-0">
          <Image
            src={isoSection!.logo!.url}
            alt={isoSection!.logo!.alt || "ISO certification logo"}
            width={164}
            height={144}
            className="h-auto w-[164px]"
          />
        </Link>
      ) : null}

      {hasContent ? (
        <div
          className="max-w-[950px] text-center prose prose-lg md:text-left"
          dangerouslySetInnerHTML={{ __html: isoSection!.contentHtml }}
        />
      ) : null}
    </div>
  );
}
