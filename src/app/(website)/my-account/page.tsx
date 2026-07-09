/**
 * File Name: page.tsx
 * Description: My Account page — Figma sidebar layout (orders, documents,
 *   addresses, account details). Protected route.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-09
 */

import type { Metadata } from "next";

import MyAccountView from "@/components/pages/Account/MyAccountView";
import { getCurrentUser, requireAuth } from "@/services/auth.service";

export const metadata: Metadata = {
  title: "My Account | Midwest Military Fasteners",
  description: "Manage your Midwest Military Fasteners account.",
};

export default async function MyAccountPage() {
  await requireAuth("/my-account");

  const user = await getCurrentUser();

  return <MyAccountView user={user} />;
}
