/**
 * File Name: layout.tsx
 * Description: Website layout shell with header, footer, cart, and toasts.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-06
 */

import Header from "@/components/layout/Header/Header";
import Footer from "@/components/layout/Footer/Footer";
import CartProvider from "@/components/layout/CartProvider/CartProvider";
import RouteProvider from "@/components/providers/RouteProvider";
import { SiteConfigProvider } from "@/components/providers/SiteConfigProvider";
import ToasterProvider from "@/components/shared_Ui/ToasterProvider";
import { getWebsiteShellData } from "@/services/shell-data.service";
import { warm_catalog_categories_cache } from "@/services/catalog-data.service";
import { warm_sidebar_categories_cache } from "@/utils/spec-parts.utils";
import CatalogWarmup from "@/components/providers/CatalogWarmup";
import CurrencyProvider from "@/components/providers/CurrencyProvider";
import { fetch_store_currency } from "@/services/currency.service";
import { get_catalog_listing_path } from "@/utils/catalog-path.utils";
import { set_store_currency } from "@/utils/currency.utils";

export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shell, currency] = await Promise.all([
    getWebsiteShellData(),
    fetch_store_currency(),
  ]);

  // Server-side formatter (product tables rendered in RSC).
  set_store_currency(currency);
  const catalog_listing_path = get_catalog_listing_path(shell.settings?.woocommerce);
  const iso_section = shell.settings?.footer
    ? {
        logo: shell.settings.footer.iso_logo,
        contentHtml: shell.settings.footer.content_area || "",
      }
    : null;

  warm_catalog_categories_cache();
  warm_sidebar_categories_cache();

  return (
    <RouteProvider>
      <SiteConfigProvider
        catalogListingPath={catalog_listing_path}
        isoSection={iso_section}
      >
        <CatalogWarmup />
        {/* Client-side formatter (search/table hooks in the browser). */}
        <CurrencyProvider currency={currency} />
        <ToasterProvider />
        <CartProvider isLoggedIn={shell.is_logged_in}>
          <Header
            menu={shell.menu}
            settings={shell.settings}
            isLoggedIn={shell.is_logged_in}
          />

          <main className="min-h-screen">{children}</main>

          <Footer footerMenu={shell.footer_menu} settings={shell.settings} />
        </CartProvider>
      </SiteConfigProvider>
    </RouteProvider>
  );
}
