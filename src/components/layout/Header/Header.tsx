/**
 * File Name: Header.tsx
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

import Link from "next/link";
import Image from "next/image";

import Navbar from "../Navbar/Navbar";
import { fetchMenu } from "@/services/menu.service";
import { MenuItem } from "@/types/menu.types";
import { normalizeMenu } from "@/utils/menu.utils";

export default async function Header() {
  let menu: MenuItem[] = [];

  try {
    menu = normalizeMenu(await fetchMenu());
  } catch (error) {
    console.error("Menu Error:", error);
  }

  return (
    <header className="border-b bg-white">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" prefetch={false}>
          <Image
            src="/images/midwest-logo.png"
            alt="Midwest Military"
            width={180}
            height={60}
            priority
          />
        </Link>

        <Navbar items={menu} />
      </div>
    </header>
  );
}
