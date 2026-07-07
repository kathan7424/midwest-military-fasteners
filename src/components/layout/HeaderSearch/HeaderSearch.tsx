/**
 * File Name: HeaderSearch.tsx
 * Description: Responsive header global search with live WordPress suggestions.
 * Developer: KP-184
 * Created Date: 2026-06-25
 * Last Modified: 2026-07-06
 */

"use client";

import { FaMagnifyingGlass } from "react-icons/fa6";

import GlobalSearchDropdown from "@/components/shared_Ui/GlobalSearchDropdown";
import { SEARCH_PLACEHOLDER } from "@/data/hero.data";
import { useGlobalSearch } from "@/hooks/use-global-search";
import { cn } from "@/lib/utils";

interface HeaderSearchProps {
  className?: string;
}

export default function HeaderSearch({ className }: HeaderSearchProps) {
  const {
    query,
    setQuery,
    isOpen,
    setIsOpen,
    suggestions,
    isLoading,
    wrapperRef,
  } = useGlobalSearch();

  return (
    <div
      ref={wrapperRef}
      className={cn("relative min-w-0 w-full", className)}
    >
      <div className="flex overflow-hidden rounded border border-light-gray bg-white">
        <input
          type="search"
          value={query}
          placeholder={SEARCH_PLACEHOLDER}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          className="min-w-0 flex-1 bg-white px-3 py-2.5 text-sm text-near-black placeholder:text-mid-gray focus:outline-none sm:px-4"
        />
        <button
          type="button"
          aria-label="Search"
          className="shrink-0 bg-amber px-3 py-2.5 text-white transition-colors hover:bg-[#b38600] sm:px-4"
        >
          <FaMagnifyingGlass size={16} />
        </button>
      </div>

      <GlobalSearchDropdown
        variant="header"
        isOpen={isOpen}
        isLoading={isLoading}
        suggestions={suggestions}
      />
    </div>
  );
}
