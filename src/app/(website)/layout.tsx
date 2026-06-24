/**
 * File Name: layout.tsx
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

import Header from "@/components/layout/Header/Header";
import Footer from "@/components/layout/Footer/Footer";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />

      <main className="min-h-screen">
        {children}
      </main>

      <Footer />
    </>
  );
}