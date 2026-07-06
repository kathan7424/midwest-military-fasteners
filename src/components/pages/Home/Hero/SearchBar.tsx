"use client";

/**
 * File Name: SearchBar.tsx
 * Description: Home hero search input with live WordPress suggestions.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-07-06
 */

import { useEffect, useRef, useState } from "react";
import { FaMagnifyingGlass } from "react-icons/fa6";

import SearchDropdown from "@/components/pages/Home/Hero/SearchDropdown";
import { SEARCH_PLACEHOLDER } from "@/data/hero.data";
import { SearchBarProps, SearchSuggestion } from "@/types/hero.types";
import { SearchApiResponse } from "@/types/search.types";
import { normalizeWpUrl } from "@/utils/url.utils";

function mapSearchResponse(data: SearchApiResponse): SearchSuggestion[] {
  return data.posts.map((post) => ({
    id: post.id,
    code: post.product?.sku || "",
    title: post.title,
    url: normalizeWpUrl(post.url),
  }));
}

export default function SearchBar({
  placeholder = SEARCH_PLACEHOLDER,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Search request failed");
        }

        const data = (await response.json()) as SearchApiResponse;
        setSuggestions(mapSearchResponse(data));
        setIsOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Home search failed:", error);
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [query]);

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
          onChange={(e) => {
            setQuery(e.target.value);
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
      <SearchDropdown
        isOpen={isOpen}
        isLoading={isLoading}
        suggestions={suggestions}
      />
    </div>
  );
}
