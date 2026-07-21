/**
 * File Name: IsoSection.tsx
 * Description: Shared ISO trust block — logo + content from WP footer settings
 *              (same API source as the Footer). Renders nothing when the API
 *              provides no content. Reused across product / cart pages.
 * Developer: pod2
 * Created Date: 2026-07-01
 * Last Modified: 2026-07-21
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
  const hastitle = Boolean(isoSection?.iso_title);

  if (!hasLogo && !hastitle && !hasContent) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-8 py-10 md:flex-row md:items-center md:gap-10",
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
            style={{ height: "auto" }}
          />
        </Link>
      ) : null}
    
    




      {hastitle && hasContent ? (
        <div className="max-w-[1010px] text-center prose prose-lg md:text-left">
          <h2 className="mb-4 text-[24px] lg:text-[32px] font-black text-black">{isoSection!.iso_title}</h2>
          <div
            className="text-[16px] text-black"
            dangerouslySetInnerHTML={{ __html: isoSection!.contentHtml }}
          />                   
        
      </div>
      ) : null}
    </div>
  );
}
     