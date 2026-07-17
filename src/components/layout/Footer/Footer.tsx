/**
 * File Name: Footer.tsx
 * Description: Site footer with dynamic settings and footer menu.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-10
 */

import Link from "next/link";

import { FooterMenuItem } from "@/types/menu.types";
import { SiteSettings } from "@/types/site-settings.types";
import { isUsableLink, normalizeWpUrl, resolveLinkUrl } from "@/utils/url.utils";
import { formatCopyrightText } from "@/utils/footer.utils";
import { decodeHtmlEntities } from "@/utils/text.utils";

interface FooterProps {
  footerMenu: FooterMenuItem[];
  settings: SiteSettings | null;
}

export default function Footer({ footerMenu, settings }: FooterProps) {
  const footer_menu = footerMenu;
  const site_settings = settings;

  const footer_settings = site_settings?.footer;
  const copyright_link = footer_settings?.copy_right_text;
  const copyright_text = copyright_link?.title
    ? formatCopyrightText(copyright_link.title)
    : null;
  const build_by_link = footer_settings?.build_by_link;
  const build_by_text = footer_settings?.build_by_text;
  const hasFooterMenu = footer_menu.length > 0;
  const hasBuildBy = Boolean(build_by_text || build_by_link?.title);
  const hasBottomBar = Boolean(copyright_text || hasFooterMenu || hasBuildBy);

  return (
    <footer className="bg-white">
      {hasBottomBar ? (
        <div className="bg-[#c79a00]">
          <div className="mx-auto max-w-[1680px] px-5">
            <div className="flex flex-col items-center justify-between gap-4 py-4 text-sm text-white lg:flex-row">
              {copyright_text ? (
                <div className="mb-0 text-center lg:text-left">
                  {copyright_link && isUsableLink(copyright_link.url) ? (
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
                  )}
                </div>
              ) : null}

              {hasFooterMenu ? (
                <ul className="flex flex-col flex-wrap items-center justify-center gap-2.5 md:flex-row md:gap-6">
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
              ) : null}

              {hasBuildBy ? (
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
      ) : null}
    </footer>
  );
}
