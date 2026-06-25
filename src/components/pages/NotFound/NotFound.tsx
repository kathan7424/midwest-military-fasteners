/**
 * File Name: NotFound.tsx
 * Description: Custom 404 page content.
 * Developer: KP-184
 * Created Date: 2026-06-24
 * Last Modified: 2026-06-24
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container mx-auto px-6 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        404
      </p>

      <h1 className="mt-4 text-4xl font-bold text-gray-900">Page Not Found</h1>

      <p className="mx-auto mt-4 max-w-md text-lg text-gray-600">
        The page you are looking for does not exist, has been moved, or is no
        longer available.
      </p>

      <Link
        href="/"
        prefetch={false}
        className="mt-8 inline-block rounded bg-black px-6 py-3 font-medium text-white transition hover:bg-gray-800"
      >
        Back to Home
      </Link>
    </div>
  );
}
