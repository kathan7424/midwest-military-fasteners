"use client";

/**
 * File Name: SearchBar.tsx
 * Description: Home hero search input with live WordPress suggestions.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-07-16
 */

import { useRouter } from "next/navigation";
import { FaMagnifyingGlass } from "react-icons/fa6";

import GlobalSearchDropdown from "@/components/shared_Ui/GlobalSearchDropdown";
import { SEARCH_PLACEHOLDER } from "@/data/hero.data";
import { useGlobalSearch } from "@/hooks/use-global-search";
import { useSiteConfig } from "@/components/providers/SiteConfigProvider";
import { SearchBarProps } from "@/types/hero.types";

export default function SearchBar({
  placeholder = SEARCH_PLACEHOLDER,
}: SearchBarProps) {
  const router = useRouter();
  // The catalog listing lives at the WC Shop page path (site config), and the
  // listing filters by the `search` query param — never a hardcoded route.
  const { catalogListingPath } = useSiteConfig();

  // Home hero search: products, product categories, and part series only.
  // The header search stays global (pages + products + everything).
  const {
    query,
    setQuery,
    isOpen,
    setIsOpen,
    suggestions,
    isLoading,
    wrapperRef,
  } = useGlobalSearch({ scope: "catalog" });

  function handleSearch() {
    const trimmed = query.trim();
    // Close the suggestion dropdown before navigating — matches HeaderSearch;
    // defensive here too in case the navigation is ever slow enough to show
    // the stale dropdown for a frame.
    setIsOpen(false);
    // WordPress standard: an empty search term is simply no filter at all —
    // WP_Query skips the search clause entirely when `s` is empty, showing
    // everything rather than an error. Match that here.
    router.push(
      trimmed
        ? `${catalogListingPath}?search=${encodeURIComponent(trimmed)}`
        : catalogListingPath
    );
  }

  return (
    <div ref={wrapperRef} className="relative mx-auto w-full max-w-[800px]">
      <div className="flex overflow-hidden bg-white shadow-lg">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          aria-label="Search by part number or keywords"
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSearch();
          }}
          className="h-14 min-w-0 flex-1 border border-navy px-4 text-base font-normal text-near-black placeholder:text-base placeholder:text-mid-gray focus:outline-none sm:h-16 sm:px-6 sm:text-lg sm:placeholder:text-lg lg:h-[72px] lg:px-8 lg:text-[24px] lg:placeholder:text-[24px]"
        />
        <button
          type="button"
          aria-label="Search"
          onClick={handleSearch}
          className="flex h-14 w-14 shrink-0 items-center justify-center bg-blue text-white transition-colors duration-300 hover:bg-navy sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px]"
        >
          <FaMagnifyingGlass className="text-lg sm:text-xl lg:text-2xl" />
        </button>
      </div>
      <GlobalSearchDropdown
        variant="hero"
        isOpen={isOpen}
        isLoading={isLoading}
        suggestions={suggestions}
      />
    </div>
  );
}
