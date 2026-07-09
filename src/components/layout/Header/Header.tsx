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
import { fetchMenu } from "@/services/menu.service";
import { fetchSiteSettings } from "@/services/site-settings.service";
import { isUserLoggedIn } from "@/services/auth.service";
import { MenuItem } from "@/types/menu.types";
import { LinkField } from "@/types/site-settings.types";
import { normalizeTel, normalizeWpUrl, resolveLinkUrl } from "@/utils/url.utils";

const DEFAULT_PHONE = "313.608.8280";
const DEFAULT_EMAIL = "sales@mwmilitary.com";

function getLinkProps(link: LinkField | null | undefined, fallbackUrl: string) {
  return {
    href: resolveLinkUrl(link?.url, fallbackUrl),
    target: link?.target || undefined,
    title: link?.title,
  };
}

export default async function Header() {
  const [menuResult, settingsResult, loggedIn] = await Promise.all([
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

  const is_logged_in = loggedIn;
  const menu = menuResult;
  const branding = settingsResult?.branding;
  const header_settings = settingsResult?.header;

  const phone = header_settings?.phone || DEFAULT_PHONE;
  const email = header_settings?.email || DEFAULT_EMAIL;
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
                      prefetch={false}
                      className="text-near-black font-normal text-link uppercase hover:text-blue transition-colors"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="flex items-center gap-10">
            <a
              href={`tel:${normalizeTel(phone)}`}
              className="flex items-center gap-2.5 text-link text-blue hover:text-navy transition-colors"
            >
              <FaPhone size={13} />
              {phone}
            </a>

            <a
              href={`mailto:${email}`}
              className="text-link text-blue uppercase hover:text-navy transition-colors"
            >
              {email}
            </a>

            {is_logged_in ? (
              <Link
                href="/my-account"
                className="flex items-center gap-[10px] px-5 xl:px-12 py-4 bg-blue text-white text-link hover:bg-navy transition-colors"
              >
                <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M4.5 4C4.5 5.375 5.625 6.5 7 6.5C8.375 6.5 9.5 5.375 9.5 4C9.5 2.625 8.375 1.5 7 1.5C5.625 1.5 4.5 2.625 4.5 4ZM1.5625 16H0L2 9.5H12L14 16H12.4375L10.9062 11H3.09375L1.5625 16ZM7 8C4.78125 8 3 6.21875 3 4C3 1.78125 4.78125 0 7 0C9.21875 0 11 1.78125 11 4C11 6.21875 9.21875 8 7 8Z" fill="currentColor"/></svg>
                ACCOUNT
              </Link>
            ) : (
              <div className="flex">
                <Link
                  href={register_link.href}
                  target={register_link.target}
                  className="flex items-center gap-[10px] px-5 py-4 bg-blue text-white uppercase text-link hover:bg-navy transition-colors"
                >
                  <svg width="13" height="16" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M6.5 7.5C4.4375 7.5 2.75 5.8125 2.75 3.75C2.75 1.6875 4.4375 0 6.5 0C8.5625 0 10.25 1.6875 10.25 3.75C10.25 5.8125 8.5625 7.5 6.5 7.5ZM13 15.75H0L2 9.25H11L13 15.75Z" fill="white"/> </svg> 
                  {register_link.title ?? "REGISTER"}
                </Link>
                <Link
                  href={login_link.href}
                  target={login_link.target}
                  className="flex items-center gap-[10px] px-5 py-4 bg-blue text-white uppercase text-link hover:bg-navy transition-colors border-l border-white/20"
                >
                  <svg width="16" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M11 2H10V0H16V14H10V12H14V2H11ZM10.7188 7.71875L6 12.4062L4.59375 11C4.78125 10.8125 5.78125 9.8125 7.59375 8H0V6H7.59375L4.59375 3L6 1.59375L6.71875 2.28125L10.7188 6.28125L11.4062 7L10.7188 7.71875Z" fill="white"/> </svg> 
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
        <Link href="/" prefetch={false} className="shrink-0 block">
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
