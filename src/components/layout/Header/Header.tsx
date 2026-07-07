/**
 * File Name: Header.tsx
 * Description: Site header with dynamic settings, auth, and global search.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-06
 */

import Link from "next/link";
import Image from "next/image";
import {
  FaPhone,
  FaUser,
  FaArrowRightToBracket,
} from "react-icons/fa6";

import Navbar from "../Navbar/Navbar";
import HeaderSearch from "../HeaderSearch/HeaderSearch";
import HeaderCartDropdown from "../HeaderCartDropdown/HeaderCartDropdown";
import { fetchMenu } from "@/services/menu.service";
import { fetchSiteSettings } from "@/services/site-settings.service";
import { isUserLoggedIn } from "@/services/auth.service";
import { MenuItem } from "@/types/menu.types";
import { LinkField } from "@/types/site-settings.types";
import { hasText } from "@/utils/content.utils";
import { normalizeTel, normalizeWpUrl, resolveLinkUrl } from "@/utils/url.utils";

function getLinkProps(link: LinkField | null | undefined, fallbackUrl: string) {
  return {
    href: resolveLinkUrl(link?.url, fallbackUrl),
    target: link?.target || undefined,
    title: link?.title,
  };
}

export default async function Header() {
  const [menuResult, settingsResult, is_logged_in] = await Promise.all([
    fetchMenu().catch((error) => {
      console.error("Menu Error:", error);
      return [] as MenuItem[];
    }),
    fetchSiteSettings().catch((error) => {
      console.error("Site Settings Error:", error);
      return null;
    }),
    isUserLoggedIn(),
  ]);

  const menu = menuResult;
  const branding = settingsResult?.branding;
  const header_settings = settingsResult?.header;

  const phone = hasText(header_settings?.phone) ? header_settings!.phone : null;
  const email = hasText(header_settings?.email) ? header_settings!.email : null;
  const register_link = getLinkProps(header_settings?.register_button, "/register");
  const login_link = getLinkProps(header_settings?.login_button, "/login");
  const show_register = hasText(header_settings?.register_button?.title);
  const show_login = hasText(header_settings?.login_button?.title);
  const show_search_bar =
    is_logged_in || Boolean(header_settings?.show_search_bar);
  const has_logo = Boolean(branding?.logo?.url);
  const has_site_title = hasText(branding?.site_title);
  const has_menu = menu.length > 0;
  const show_top_bar =
    (is_logged_in && has_menu) ||
    Boolean(phone || email || show_register || show_login || is_logged_in);

  const contactLinkClass = is_logged_in
    ? "text-link text-amber transition-colors hover:text-[#b38600]"
    : "text-link text-blue transition-colors hover:text-navy";

  return (
    <header className="relative bg-white shadow-[0_0_10px_rgba(0,0,0,0.05)]">
      {show_top_bar ? (
        <div className="hidden bg-off-white lg:block">
          <div className="mx-auto flex max-w-8xl items-center justify-end gap-6 px-5">
            {is_logged_in && has_menu ? (
              <nav aria-label="Top navigation">
                <ul className="flex items-center gap-6">
                  {menu.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={normalizeWpUrl(item.url)}
                        prefetch={false}
                        className="text-sm font-semibold uppercase tracking-wide text-near-black transition-colors hover:text-blue"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}

            {phone ? (
              <a
                href={`tel:${normalizeTel(phone)}`}
                className={`flex items-center gap-1.5 ${contactLinkClass}`}
              >
                <FaPhone size={13} />
                {phone}
              </a>
            ) : null}

            {email ? (
              <a
                href={`mailto:${email}`}
                className={`uppercase tracking-wide ${contactLinkClass}`}
              >
                {email}
              </a>
            ) : null}

            {is_logged_in ? (
              <Link
                href="/my-account"
                className="flex items-center gap-[10px] bg-blue px-5 py-4 text-link text-white transition-colors hover:bg-navy"
              >
                <FaUser size={13} />
                ACCOUNT
              </Link>
            ) : (
              <div className="flex">
                {show_register ? (
                  <Link
                    href={register_link.href}
                    target={register_link.target}
                    className="flex items-center gap-[10px] bg-blue px-5 py-4 text-link text-white transition-colors hover:bg-navy"
                  >
                    <FaUser size={13} />
                    {register_link.title}
                  </Link>
                ) : null}
                {show_login ? (
                  <Link
                    href={login_link.href}
                    target={login_link.target}
                    className={`flex items-center gap-[10px] bg-blue px-5 py-4 text-link text-white transition-colors hover:bg-navy ${
                      show_register ? "border-l border-white/20" : ""
                    }`}
                  >
                    <FaArrowRightToBracket size={13} />
                    {login_link.title}
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-8xl px-5 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" prefetch={false} className="block shrink-0">
            {has_logo ? (
              <Image
                src={branding!.logo!.url}
                alt={
                  branding?.logo?.alt ||
                  branding?.site_title ||
                  "Midwest Military Fasteners"
                }
                width={235}
                height={60}
                priority
                className="h-auto w-[276px] max-w-[186px] sm:max-w-full"
              />
            ) : has_site_title ? (
              <span className="text-xl font-bold text-near-black">
                {branding!.site_title}
              </span>
            ) : null}
          </Link>

          {show_search_bar ? (
            <div className="hidden min-w-0 flex-1 lg:block lg:px-6">
              <HeaderSearch />
            </div>
          ) : (
            <div className="hidden flex-1 lg:block" />
          )}

          <div className="ml-auto flex shrink-0 items-center gap-3">
            {show_search_bar && is_logged_in ? (
              <>
                <HeaderCartDropdown variant="compact" className="lg:hidden" />
                <HeaderCartDropdown variant="full" className="hidden lg:block" />
              </>
            ) : null}

            {has_menu ? (
              <Navbar
                items={menu}
                phone={phone}
                email={email}
                registerLink={register_link}
                loginLink={login_link}
                showRegister={show_register}
                showLogin={show_login}
                isLoggedIn={is_logged_in}
                hideDesktopNav={Boolean(show_search_bar)}
              />
            ) : null}
          </div>
        </div>

        {show_search_bar ? (
          <div className="mt-3 lg:hidden">
            <HeaderSearch />
          </div>
        ) : null}
      </div>
    </header>
  );
}
