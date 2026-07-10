/**
 * File Name: DashboardPanel.tsx
 * Description: My Account → Dashboard — welcome message only.
 *   Orders live in the Orders tab; addresses live in the Addresses tab.
 * Developer: KP-184
 * Created Date: 2026-07-09
 * Last Modified: 2026-07-10
 */

import type { AccountUser } from "./MyAccountView";

export default function DashboardPanel({
  user,
}: {
  user: AccountUser | null;
  onNavigate: (section: string) => void;
}) {
  const firstName =
    user?.first_name || user?.display_name?.split(" ")[0] || "there";

  return (
    <p className="text-link text-dark-gray">
      Hello,{" "}
      <span className="font-semibold text-near-black">{firstName}</span>.{" "}
      From your account dashboard you can view your recent orders, manage your
      shipping and billing addresses, and edit your password and account
      details.
    </p>
  );
}
