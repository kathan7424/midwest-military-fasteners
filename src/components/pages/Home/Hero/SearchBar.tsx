"use client";

/**
 * File Name: SearchBar.tsx
 * Description: Home hero search input with live WordPress suggestions.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-07-06
 */

import { FaMagnifyingGlass } from "react-icons/fa6";

import GlobalSearchDropdown from "@/components/shared_Ui/GlobalSearchDropdown";
import { SEARCH_PLACEHOLDER } from "@/data/hero.data";
import { useGlobalSearch } from "@/hooks/use-global-search";
import { SearchBarProps } from "@/types/hero.types";

export default function SearchBar({
  placeholder = SEARCH_PLACEHOLDER,
}: SearchBarProps) {
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

  return (
    <div ref={wrapperRef} className="relative mx-auto w-full max-w-[800px]">
      <div className="flex overflow-hidden bg-white shadow-lg">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          className="h-14 min-w-0 flex-1 border border-navy px-4 text-base font-normal text-near-black placeholder:text-base placeholder:text-mid-gray focus:border-b-transparent focus:outline-none sm:h-16 sm:px-6 sm:text-lg sm:placeholder:text-lg lg:h-[72px] lg:px-8 lg:text-[24px] lg:placeholder:text-[24px]"
        />
        <button
          type="button"
          aria-label="Search"
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
