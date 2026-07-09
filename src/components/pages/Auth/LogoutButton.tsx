/**
 * File Name: LogoutButton.tsx
 * Description: Client logout button (Untitled UI).
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-07
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/base/buttons/button";
import { PUBLIC_ROUTES } from "@/config/routes";
import { logout_user } from "@/services/auth-client.service";
import { useCartStore } from "@/stores/cart.store";
import { notifyError, notifySuccess } from "@/utils/notifications";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      const response = await logout_user();

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      // WooCommerce standard: the session cart belongs to the logged-in user.
      // Clear client cart state immediately — the user's cart stays saved
      // server-side and comes back on their next login.
      useCartStore.getState().setCart(null);

      notifySuccess("Logged out successfully.");
      router.push(PUBLIC_ROUTES.home);
      router.refresh();
    } catch {
      notifyError("Logout failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      color="primary"
      size="md"
      isDisabled={isLoading}
      onClick={handleLogout}
    >
      {isLoading ? "Logging out..." : "Log Out"}
    </Button>
  );
}
