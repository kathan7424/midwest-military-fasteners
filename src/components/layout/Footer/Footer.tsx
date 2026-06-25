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
  const copyright_text =
    footer_settings?.copy_right_text?.title ||
    "Copyright 2026 Midwest Military Fasteners LLC";
  const build_by_text = footer_settings?.build_by_text || "Website Design by";
  const copyright_link = footer_settings?.copy_right_text;
  const build_by_link = footer_settings?.build_by_link;

  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-[1680px] px-5">
        <div className="flex flex-col items-center gap-8 py-12 md:flex-row md:items-center md:justify-center md:gap-16">
          <Link href="/" prefetch={false} className="shrink-0 block">
            <Image
              src={
                footer_settings?.iso_logo?.url ??
                "/images/ISO_9001-2015-logo.svg"
              }
              alt={
                footer_settings?.iso_logo?.alt ||
                "Midwest Military Fasteners"
              }
              width={164}
              height={144}
              className="h-auto w-[164px]"
              priority
              style={{ width: "auto", height: "auto" }}
            />
          </Link>

          {footer_settings?.content_area ? (
            <div
              className="max-w-[900px] text-center md:text-left text-gray-700 prose prose-lg"
              dangerouslySetInnerHTML={{ __html: footer_settings.content_area }}
            />
          ) : (
            <div className="max-w-[900px] text-center md:text-left">
              <h2 className="mb-4 text-3xl font-bold text-black">
                Your First & Final Stop for Standard and Specialty Fasteners.
              </h2>
              <p className="mb-4 text-lg leading-relaxed text-gray-700">
                Proudly serving customers ranging from small machine shops, to the
                military, aerospace, marine, and heavy industrial. We are the
                fast, honest, and knowledgeable supplier for your critical
                hardware needs.
              </p>
              <p className="text-lg text-gray-700">ISO 9001:2015 Registered</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#c79a00]">
        <div className="mx-auto max-w-[1680px] px-5">
          <div className="flex flex-col items-center justify-between gap-4 py-4 text-sm text-white lg:flex-row">
            <div>
              {copyright_link && isUsableLink(copyright_link.url) ? (
                <Link
                  href={normalizeWpUrl(copyright_link.url)}
                  target={copyright_link.target || undefined}
                  prefetch={false}
                  className="transition-opacity hover:opacity-80"
                >
                  {copyright_text}
                </Link>
              ) : (
                <span>{copyright_text}</span>
              )}
            </div>

            <ul className="flex flex-wrap items-center justify-center gap-6">
              {footer_menu.map((item) => (
                <li key={item.id}>
                  <Link
                    href={normalizeWpUrl(item.url || "#")}
                    prefetch={false}
                    className="transition-opacity hover:opacity-80"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>

            <div>
              {build_by_text}{" "}
              <Link
                href={resolveLinkUrl(build_by_link?.url, "#")}
                target={build_by_link?.target || undefined}
                prefetch={false}
                className="hover:underline"
              >
                {build_by_link?.title ?? "build/create"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
