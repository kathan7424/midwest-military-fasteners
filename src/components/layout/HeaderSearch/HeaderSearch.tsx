/**
 * File Name: HeaderSearch.tsx
 * Description: Responsive header global search with live WordPress suggestions.
 * Developer: KP-184
 * Created Date: 2026-06-25
 * Last Modified: 2026-07-16
 */

"use client";

import { useRouter } from "next/navigation";
import { FaMagnifyingGlass } from "react-icons/fa6";

import GlobalSearchDropdown from "@/components/shared_Ui/GlobalSearchDropdown";
import { SEARCH_PLACEHOLDER } from "@/data/hero.data";
import { useGlobalSearch } from "@/hooks/use-global-search";
import { useSiteConfig } from "@/components/providers/SiteConfigProvider";
import { cn } from "@/lib/utils";

interface HeaderSearchProps {
  className?: string;
}

export default function HeaderSearch({ className }: HeaderSearchProps) {
  const router = useRouter();
  // The catalog listing lives at the WC Shop page path (site config), and the
  // listing filters by the `search` query param — never a hardcoded route.
  const { catalogListingPath } = useSiteConfig();

  const {
    query,
    setQuery,
    isOpen,
    setIsOpen,
    suggestions,
    isLoading,
    wrapperRef,
    clearSearch,
  } = useGlobalSearch<HTMLFormElement>();

  function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`${catalogListingPath}?search=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      ref={wrapperRef}
      action={catalogListingPath}
      method="GET"
      className={cn(
        "relative hidden w-full max-w-[690px] flex-1 items-center lg:flex",
        className
      )}
      onSubmit={(event) => {
        event.preventDefault();
        handleSearch();
      }}
    >
      <div className="flex w-full">
        <input
          type="search"
          name="search"
          value={query}
          placeholder={SEARCH_PLACEHOLDER}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onChange={(event) => {
            const value = event.target.value;

            if (value.trim() === "") {
              clearSearch();
              return;
            }

            setQuery(value);
          }}
          className="h-12 flex-1 rounded-none border border-navy border-r-0 bg-white px-4 py-3.5 text-link text-near-black outline-none placeholder:text-[#A5A5A5]"
        />
        <button
          type="submit"
          aria-label="Search"
          className="h-12 rounded-none bg-amber px-4 py-3.5 text-white transition-colors hover:bg-amber/90"
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
    </form>
  );
}
