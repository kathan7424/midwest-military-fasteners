/**
 * File Name: Header.tsx
 * Description: Site header with dynamic settings, auth, and search conditionals.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-25
 */

import Link from "next/link";
import Image from "next/image";
import {
  FaPhone,
  FaUser,
  FaArrowRightToBracket,
  FaCartShopping,
} from "react-icons/fa6";

import Navbar from "../Navbar/Navbar";
import HeaderSearch from "../HeaderSearch/HeaderSearch";
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

  const phone = header_settings?.phone || DEFAULT_PHONE;
  const email = header_settings?.email || DEFAULT_EMAIL;
  const register_link = getLinkProps(header_settings?.register_button, "/register");
  const login_link = getLinkProps(header_settings?.login_button, "/login");
  const show_search_bar =
    is_logged_in || Boolean(header_settings?.show_search_bar);

  return (
    <header className="bg-white relative">

      {/* ── Top utility bar (desktop only) ── */}
      <div className="hidden lg:block bg-off-white">
        <div
          className={`mx-auto flex items-center px-5 ${
            is_logged_in ? "justify-between max-w-8xl" : "justify-end gap-6"
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
                      className="text-near-black font-semibold text-sm uppercase tracking-wide hover:text-blue transition-colors"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="flex items-center gap-6">
            <a
              href={`tel:${normalizeTel(phone)}`}
              className="flex items-center gap-1.5 text-link text-blue hover:text-navy transition-colors"
            >
              <FaPhone size={13} />
              {phone}
            </a>

            <a
              href={`mailto:${email}`}
              className="text-link text-blue uppercase tracking-wide hover:text-navy transition-colors"
            >
              {email}
            </a>

            {is_logged_in ? (
              <Link
                href="/my-account"
                className="flex items-center gap-[10px] px-5 py-4 bg-blue text-white text-link hover:bg-navy transition-colors"
              >
                <FaUser size={13} />
                MY ACCOUNT
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

      {/* ── Main row ── */}
      <div className="max-w-8xl mx-auto flex items-center justify-between px-5 py-4">
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
          <>
            <HeaderSearch />
            {is_logged_in && (
              <Link
                href="/cart"
                className="hidden lg:flex items-center gap-2 px-5 py-2 bg-amber text-white text-sm font-semibold rounded hover:bg-amber/90 transition-colors shrink-0"
              >
                <FaCartShopping size={15} />
                YOUR ORDER
              </Link>
            )}
          </>
        ) : (
          <Navbar
            items={menu}
            phone={phone}
            email={email}
            registerLink={register_link}
            loginLink={login_link}
          />
        )}
      </div>
    </header>
  );
}
