/**
 * File Name: SearchRetryForm.tsx
 * Description: Inline search form shown on the results page itself — WP
 *              standard practice on a "nothing found"/empty search page so
 *              the visitor can retry without going back to the header.
 * Developer: KP-184
 * Created Date: 2026-07-21
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SearchRetryFormProps {
  initialQuery?: string;
}

export default function SearchRetryForm({
  initialQuery = "",
}: SearchRetryFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  return (
    <form
      className="mt-6 flex w-full max-w-[560px] flex-col gap-3 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = value.trim();
        router.push(trimmed ? `/?s=${encodeURIComponent(trimmed)}` : "/?s=");
      }}
    >
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by part # or keywords"
        aria-label="Search again"
        className="h-12 flex-1 border border-blue px-4 text-body text-near-black outline-none placeholder:text-mid-gray focus:border-blue"
      />
      <button
        type="submit"
        className="h-12 bg-amber px-8 text-link font-bold uppercase text-white transition-colors hover:bg-amber/90"
      >
        Search
      </button>
    </form>
  );
}
