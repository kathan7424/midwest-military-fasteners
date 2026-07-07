/**
 * File Name: use-global-search.ts
 * Description: Shared WordPress global search hook for header and hero.
 * Developer: KP-184
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

"use client";

import { useEffect, useRef, useState } from "react";

import { SearchSuggestion } from "@/types/hero.types";
import { SearchApiResponse } from "@/types/search.types";
import { normalizeWpUrl } from "@/utils/url.utils";

const TYPE_LABELS: Record<string, string> = {
  product: "Product",
  page: "Page",
  post: "Post",
};

const TAXONOMY_LABELS: Record<string, string> = {
  category: "Category",
  post_tag: "Tag",
  product_cat: "Category",
  product_tag: "Tag",
};

function mapSearchResponse(data: SearchApiResponse): SearchSuggestion[] {
  const posts: SearchSuggestion[] = data.posts.map((post) => ({
    id: `post-${post.id}`,
    code: post.product?.sku || TYPE_LABELS[post.type] || post.type,
    title: post.title,
    url: normalizeWpUrl(post.url),
    type:
      post.type === "product" || post.type === "page" || post.type === "post"
        ? post.type
        : "post",
  }));

  const terms: SearchSuggestion[] = data.terms.map((term) => ({
    id: `term-${term.id}-${term.taxonomy}`,
    code: TAXONOMY_LABELS[term.taxonomy] || "Term",
    title: term.name,
    url: normalizeWpUrl(term.url),
    type: "term",
  }));

  return [...posts, ...terms];
}

export function useGlobalSearch() {
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
          console.error("Global search failed:", error);
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

  return {
    query,
    setQuery,
    isOpen,
    setIsOpen,
    suggestions,
    isLoading,
    wrapperRef,
  };
}
