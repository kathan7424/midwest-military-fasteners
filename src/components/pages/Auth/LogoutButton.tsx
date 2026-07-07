/**
 * File Name: LogoutButton.tsx
 * Description: Client logout button calling auth API proxy.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { PUBLIC_ROUTES } from "@/config/routes";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      toast.success("Logged out successfully.");
      router.push(PUBLIC_ROUTES.home);
      router.refresh();
    } catch {
      toast.error("Logout failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className="rounded bg-blue px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy disabled:opacity-60"
    >
      {isLoading ? "Logging out..." : "Log Out"}
    </button>
  );
}
