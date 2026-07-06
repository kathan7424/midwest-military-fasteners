/**
 * File Name: Footer.tsx
 * Description: Site footer with dynamic settings and footer menu.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-25
 */

import Link from "next/link";
import Image from "next/image";

import { fetchFooterMenu } from "@/services/menu.service";
import { fetchSiteSettings } from "@/services/site-settings.service";
import { FooterMenuItem } from "@/types/menu.types";
import { isUsableLink, normalizeWpUrl, resolveLinkUrl } from "@/utils/url.utils";
import { formatCopyrightText } from "@/utils/footer.utils";
import { decodeHtmlEntities } from "@/utils/text.utils";

export default async function Footer() {
  const [footer_menu, site_settings] = await Promise.all([
    fetchFooterMenu().catch((error) => {
      console.error("Footer menu fetch failed:", error);
      return [] as FooterMenuItem[];
    }),
    fetchSiteSettings().catch((error) => {
      console.error("Site settings fetch failed:", error);
      return null;
    }),
  ]);

  const footer_settings = site_settings?.footer;
  const copyright_link = footer_settings?.copy_right_text;
  const copyright_text = copyright_link?.title
    ? formatCopyrightText(copyright_link.title)
    : null;
  const build_by_link = footer_settings?.build_by_link;
  const build_by_text = footer_settings?.build_by_text;
  const iso_logo = footer_settings?.iso_logo;
  const content_area = footer_settings?.content_area;

  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-[1680px] px-5">
        <div className="flex flex-col items-center gap-8 py-12 md:flex-row md:items-center md:justify-center md:gap-10">
          {iso_logo?.url ? (
            <div className="shrink-0 block">
              <Image
                src={iso_logo.url}
                alt={iso_logo.alt || "ISO certification logo"}
                width={164}
                height={144}
                className="h-auto w-[164px]"
                priority
                style={{ width: "auto", height: "auto" }}
              />
            </div>
          ) : null}

          {content_area ? (
            <div
              className="max-w-[950px] text-center md:text-left prose prose-lg"
              dangerouslySetInnerHTML={{ __html: content_area }}
            />
          ) : null}
        </div>
      </div>

      <div className="bg-[#c79a00]">
        <div className="mx-auto max-w-[1680px] px-5">
          <div className="flex flex-col items-center justify-between gap-4 py-4 text-sm text-white lg:flex-row">
            <div className="text-center lg:text-left mb-0">
              {copyright_text ? (
                copyright_link && isUsableLink(copyright_link.url) ? (
                  <Link
                    href={normalizeWpUrl(copyright_link.url)}
                    target={copyright_link.target || undefined}
                    prefetch={false}
                    className="transition-colors hover:text-black"
                  >
                    {copyright_text}
                  </Link>
                ) : (
                  <span>{copyright_text}</span>
                )
              ) : null}
            </div>

            <ul className="flex flex-col md:flex-row flex-wrap items-center justify-center gap-2.5 md:gap-6">
              {footer_menu.map((item) => (
                <li key={item.id}>
                  <Link
                    href={normalizeWpUrl(item.url || "#")}
                    prefetch={false}
                    className="transition-colors hover:text-black"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>

            {build_by_text || build_by_link?.title ? (
              <div>
                {build_by_text ? `${decodeHtmlEntities(build_by_text)} ` : null}
                {build_by_link?.title ? (
                  <Link
                    href={resolveLinkUrl(build_by_link.url, "#")}
                    target={build_by_link.target || undefined}
                    prefetch={false}
                    className="transition-colors hover:text-black"
                  >
                    {decodeHtmlEntities(build_by_link.title)}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
