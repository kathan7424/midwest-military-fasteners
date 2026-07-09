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
import HeaderCartDropdown from "../HeaderCartDropdown/HeaderCartDropdown";
import HeaderSearch from "../HeaderSearch/HeaderSearch";
import HeaderCart from "../HeaderCart/HeaderCart";
import { MenuItem } from "@/types/menu.types";
import { LinkField, SiteSettings } from "@/types/site-settings.types";
import { normalizeTel, normalizeWpUrl, resolveLinkUrl } from "@/utils/url.utils";

interface HeaderProps {
  menu: MenuItem[];
  settings: SiteSettings | null;
  isLoggedIn: boolean;
}

function getLinkProps(link: LinkField | null | undefined, fallbackUrl: string) {
  return {
    href: resolveLinkUrl(link?.url, fallbackUrl),
    target: link?.target || undefined,
    title: link?.title,
  };
}

export default function Header({ menu, settings, isLoggedIn }: HeaderProps) {
  const is_logged_in = isLoggedIn;
  const branding = settings?.branding;
  const header_settings = settings?.header;

  const phone = header_settings?.phone || "";
  const email = header_settings?.email || "";
  const register_link = getLinkProps(header_settings?.register_button, "/register");
  const login_link = getLinkProps(header_settings?.login_button, "/login");
  const show_search_bar =
    is_logged_in || Boolean(header_settings?.show_search_bar);

  return (
    <header className="bg-white relative shadow-[0_0_10px_rgba(0,0,0,0.05)]">
      <div className="hidden lg:block bg-off-white">
        <div
          className={`mx-auto flex items-center justify-end ${
            is_logged_in ? "gap-14" : "gap-6"
          }`}
        >
          {is_logged_in && (
            <nav aria-label="Top navigation">
              <ul className="flex items-center gap-6">
                {menu.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={normalizeWpUrl(item.url)}
                      className="text-near-black font-normal text-link uppercase tracking-wide hover:text-blue transition-colors"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="flex items-center gap-10">
            {phone ? (
              <a
                href={`tel:${normalizeTel(phone)}`}
                className="flex items-center gap-2.5 text-link text-blue hover:text-navy transition-colors"
              >
                <FaPhone size={13} />
                {phone}
              </a>
            ) : null}

            {email ? (
              <a
                href={`mailto:${email}`}
                className="text-link text-blue uppercase tracking-wide hover:text-navy transition-colors"
              >
                {email}
              </a>
            ) : null}

            {is_logged_in ? (
              <Link
                href="/my-account"
                className="flex items-center gap-[10px] px-5 xl:px-12 py-4 bg-blue text-white text-link hover:bg-navy transition-colors"
              >
                <FaUser size={13} />
                ACCOUNT
              </Link>
            ) : (
              <div className="flex">
                <Link
                  href={register_link.href}
                  target={register_link.target}
                  className="flex items-center gap-[10px] px-5 py-4 bg-blue text-white text-link hover:bg-navy transition-colors"
                >
                  <FaUser size={13} />
                  {register_link.title ?? "REGISTER"}
                </Link>
                <Link
                  href={login_link.href}
                  target={login_link.target}
                  className="flex items-center gap-[10px] px-5 py-4 bg-blue text-white text-link hover:bg-navy transition-colors border-l border-white/20"
                >
                  <FaArrowRightToBracket size={13} />
                  {login_link.title ?? "LOGIN"}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`mx-auto flex items-center justify-between px-5 py-4 ${
          is_logged_in ? "w-full max-w-full" : "max-w-8xl"
        }`}
      >
        <Link href="/" className="shrink-0 block">
          <Image
            src={branding?.logo?.url ?? "/images/midwest-logo.svg"}
            alt={
              branding?.logo?.alt ||
              branding?.site_title ||
              "Midwest Military Fasteners"
            }
            width={235}
            height={60}
            priority
            className="h-auto max-w-[186px] sm:max-w-full w-[276px]"
          />
        </Link>

        {show_search_bar ? (
          <div className="ml-auto flex items-center gap-3 lg:w-8/12 lg:justify-end lg:gap-10">
            <HeaderSearch />
            {is_logged_in ? (
              <>
                <HeaderCart />
                <HeaderCartDropdown variant="compact" className="lg:hidden" />
              </>
            ) : null}
            <Navbar
              items={menu}
              phone={phone}
              email={email}
              registerLink={register_link}
              loginLink={login_link}
              showRegister={!is_logged_in}
              showLogin={!is_logged_in}
              isLoggedIn={is_logged_in}
              hideDesktopNav
              showMobileCartLink={!is_logged_in}
            />
          </div>
        ) : (
          <Navbar
            items={menu}
            phone={phone}
            email={email}
            registerLink={register_link}
            loginLink={login_link}
            showRegister={!is_logged_in}
            showLogin={!is_logged_in}
            isLoggedIn={is_logged_in}
            showMobileCartLink={!is_logged_in}
          />
        )}
      </div>

      {show_search_bar ? (
        <div className="border-t border-light-gray bg-white px-5 py-3 lg:hidden">
          <HeaderSearch className="!flex !max-w-none" />
        </div>
      ) : null}

    </header>
  );
}
