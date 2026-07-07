"use client";

import { useRouter } from "next/navigation";
import { RouterProvider } from "react-aria-components";

export default function RouteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return <RouterProvider navigate={router.push}>{children}</RouterProvider>;
}
