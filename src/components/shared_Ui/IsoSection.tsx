/**
 * File Name: IsoSection.tsx
 * Description: Shared ISO 9001:2015 trust block — logo + tagline + copy. Matches
 *              the site Footer's ISO section (font, width, wording). Reused across
 *              product listing / detail pages.
 * Developer: pod2
 * Created Date: 2026-07-01
 * Last Modified: 2026-07-01
 */

import Image from "next/image";
import Link from "next/link";

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
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-8 py-12 md:flex-row md:items-center md:gap-10",
        align === "center" ? "md:justify-center" : "md:justify-start",
        className
      )}
    >
      <Link href="/" prefetch={false} className="block shrink-0">
        <Image
          src="/images/ISO_9001-2015-logo.svg"
          alt="Midwest Military Fasteners"
          width={164}
          height={144}
          className="h-auto w-[164px]"
        />
      </Link>

      <div className="max-w-[950px] text-center md:text-left">
        <h2 className="mb-5 text-3xl font-black text-black">
          Your First &amp; Final Stop for Standard and Specialty Fasteners.
        </h2>

        <p className="mb-5 text-lg leading-relaxed text-black">
          Proudly serving customers ranging from small machine shops, to the
          military, aerospace, marine, and heavy industrial. We are the fast,
          honest, and knowledgeable supplier for your critical hardware needs.
        </p>

        <p className="mb-0 text-lg text-black">ISO 9001:2015 Registered</p>
      </div>
    </div>
  );
}
