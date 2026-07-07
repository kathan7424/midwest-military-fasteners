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
import ToasterProvider from "@/components/shared_Ui/ToasterProvider";
import { isUserLoggedIn } from "@/services/auth.service";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const is_logged_in = await isUserLoggedIn();

  return (
    <>
      <ToasterProvider />
      <CartProvider isLoggedIn={is_logged_in}>
        <Header />

        <main className="min-h-screen">{children}</main>

        <Footer />
      </CartProvider>
    </>
  );
}
