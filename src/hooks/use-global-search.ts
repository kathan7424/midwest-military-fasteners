/**
 * File Name: use-global-search.ts
 * Description: Shared WordPress global search hook for header and hero.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SearchSuggestion } from "@/types/hero.types";
import { SearchApiResponse } from "@/types/search.types";
import { decodeHtmlEntities } from "@/utils/text.utils";
import { normalizeWpUrl } from "@/utils/url.utils";
import { SEARCH_TYPE_LABELS, get_search_taxonomy_label } from "@/utils/search.utils";

function mapSearchResponse(data: SearchApiResponse): SearchSuggestion[] {
  const posts: SearchSuggestion[] = data.posts.map((post) => ({
    id: `post-${post.id}`,
    code: decodeHtmlEntities(
      post.product?.sku || SEARCH_TYPE_LABELS[post.type] || post.type
    ),
    title: decodeHtmlEntities(post.title),
    url: normalizeWpUrl(post.url),
    type:
      post.type === "product" || post.type === "page" || post.type === "post"
        ? post.type
        : "post",
  }));

  const terms: SearchSuggestion[] = data.terms.map((term) => ({
    id: `term-${term.id}-${term.taxonomy}`,
    code: get_search_taxonomy_label(term.taxonomy),
    title: decodeHtmlEntities(term.name),
    url: normalizeWpUrl(term.url),
    type: "term",
  }));

  return [...posts, ...terms];
}

export interface UseGlobalSearchOptions {
  /** "catalog" = products + product categories/series only (home hero). */
  scope?: "global" | "catalog";
}

export function useGlobalSearch<T extends HTMLElement = HTMLDivElement>(
  options: UseGlobalSearchOptions = {}
) {
  const scope = options.scope ?? "global";
  const [query, setQueryState] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<T>(null);
  const latestQueryRef = useRef("");

  // Short queries never show results — reset in the event handler rather
  // than in the debounce effect so the effect never sets state synchronously.
  const setQuery = useCallback((value: string) => {
    setQueryState(value);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setIsOpen(false);
    }
  }, []);

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
    latestQueryRef.current = trimmed;

    if (trimmed.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      const searchQuery = trimmed;
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}${scope === "catalog" ? "&scope=catalog" : ""}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Search request failed");
        }

        if (latestQueryRef.current !== searchQuery) {
          return;
        }

        const data = (await response.json()) as SearchApiResponse;
        setSuggestions(mapSearchResponse(data));
        setIsOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          if (latestQueryRef.current === searchQuery) {
            console.error("Global search failed:", error);
            setSuggestions([]);
            setIsOpen(false);
          }
        }
      } finally {
        if (latestQueryRef.current === searchQuery) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [query, scope]);

  const clearSearch = () => {
    latestQueryRef.current = "";
    setQueryState("");
    setSuggestions([]);
    setIsLoading(false);
    setIsOpen(false);
  };

  return {
    query,
    setQuery,
    isOpen,
    setIsOpen,
    suggestions,
    isLoading,
    wrapperRef,
    clearSearch,
  };
}
