/**
 * File Name: use-catalog-product-search.ts
 * Description: Instant client filter + debounced WC catalog API search.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Product } from "@/components/pages/Product/ProductTable";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { fetch_catalog_products_client } from "@/services/product-catalog.client";
import { map_spec_parts_product_to_table_product } from "@/utils/spec-parts.utils";
import { sync_catalog_search_query } from "@/utils/catalog-url.utils";

interface UseCatalogProductSearchParams {
  products: Product[];
  currentPage: number;
  totalPages: number;
  initialSearch?: string;
  categorySlug?: string;
  seriesSlug?: string;
  pathname: string;
}

function filter_products_by_query(items: Product[], query: string): Product[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return items;
  }

  return items.filter((product) => {
    return (
      product.partNumber.toLowerCase().includes(normalized) ||
      product.sku.toLowerCase().includes(normalized) ||
      product.description.toLowerCase().includes(normalized)
    );
  });
}

export function useCatalogProductSearch({
  products,
  currentPage,
  totalPages,
  initialSearch = "",
  categorySlug,
  seriesSlug,
  pathname,
}: UseCatalogProductSearchParams) {
  const [filter, setFilter] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(filter, 150);
  const [tableProducts, setTableProducts] = useState(products);
  const [tablePage, setTablePage] = useState(currentPage);
  const [tableTotalPages, setTableTotalPages] = useState(totalPages);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSeriesSlug, setActiveSeriesSlug] = useState(seriesSlug);
  const requestIdRef = useRef(0);
  const skipInitialFetchRef = useRef(true);
  // Pagination/series-switch fetches previously had no AbortController — a
  // superseded request (rapid page clicks) still ran to completion on the
  // network even though its response was discarded via requestIdRef. Reused
  // here the same way the search-as-you-type effect already does it.
  const pagingAbortRef = useRef<AbortController | null>(null);

  // Adopt a new series from the URL (e.g. direct link / browser back) when it
  // changes and wasn't just set by our own client-side switch.
  const [prevSeriesSlug, setPrevSeriesSlug] = useState(seriesSlug);
  if (prevSeriesSlug !== seriesSlug) {
    setPrevSeriesSlug(seriesSlug);
    setActiveSeriesSlug(seriesSlug);
  }

  useEffect(() => {
    skipInitialFetchRef.current = true;
  }, [pathname, categorySlug, seriesSlug, initialSearch]);

  // Sync the server-provided baseline into table state when the props change
  // and no client filter is active (adjust state during render, not an effect).
  const [prevBaseline, setPrevBaseline] = useState({
    products,
    currentPage,
    totalPages,
  });

  if (
    prevBaseline.products !== products ||
    prevBaseline.currentPage !== currentPage ||
    prevBaseline.totalPages !== totalPages
  ) {
    setPrevBaseline({ products, currentPage, totalPages });

    if (!filter.trim()) {
      setTableProducts(products);
      setTablePage(currentPage);
      setTableTotalPages(totalPages);
    }
  }

  // Adopt a new initial search (e.g. from the URL) when it changes.
  const [prevInitialSearch, setPrevInitialSearch] = useState(initialSearch);

  if (prevInitialSearch !== initialSearch) {
    setPrevInitialSearch(initialSearch);
    setFilter(initialSearch);
  }

  const resetToBaseline = useCallback(() => {
    setTableProducts(products);
    setTablePage(currentPage);
    setTableTotalPages(totalPages);
    setIsSearching(false);
    sync_catalog_search_query(pathname, "");
  }, [products, currentPage, totalPages, pathname]);

  const handleFilterChange = useCallback(
    (value: string) => {
      setFilter(value);

      if (!value.trim()) {
        requestIdRef.current += 1;
        resetToBaseline();
      }
    },
    [resetToBaseline]
  );

  // Client-side pagination: fetch the page from the catalog API and sync the
  // URL with pushState — no server component re-render, so page changes are
  // as fast as the (ISR-cached) API response instead of a full navigation.
  const [isPaging, setIsPaging] = useState(false);

  const handlePageChange = useCallback(
    (page: number) => {
      pagingAbortRef.current?.abort();
      const controller = new AbortController();
      pagingAbortRef.current = controller;

      const requestId = ++requestIdRef.current;
      setIsPaging(true);

      const params = new URLSearchParams(window.location.search);
      if (page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
      const next_url = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
      window.history.pushState(null, "", next_url);

      fetch_catalog_products_client({
        search: debouncedSearch.trim() || undefined,
        category: categorySlug,
        series: activeSeriesSlug,
        page,
        per_page: 10,
        signal: controller.signal,
      })
        .then((response) => {
          if (requestId !== requestIdRef.current) {
            return;
          }

          setTableProducts(
            response.products.map(map_spec_parts_product_to_table_product)
          );
          setTablePage(response.page);
          setTableTotalPages(response.pages);
          window.scrollTo({ top: 0, behavior: "smooth" });
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          console.error("Catalog pagination failed:", error);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            setIsPaging(false);
          }
        });
    },
    [pathname, debouncedSearch, categorySlug, activeSeriesSlug]
  );

  // Client-side series switch (sidebar series links within the SAME category):
  // same fast pattern as pagination — no full page navigation, just a scoped
  // catalog API fetch + pushState. Only valid when the target series belongs
  // to the current category page; the Sidebar caller is responsible for that
  // check (a different category still does a real navigation).
  const handleSeriesChange = useCallback(
    (nextSeriesSlug: string | undefined, href: string) => {
      pagingAbortRef.current?.abort();
      const controller = new AbortController();
      pagingAbortRef.current = controller;

      const requestId = ++requestIdRef.current;
      setIsPaging(true);
      setActiveSeriesSlug(nextSeriesSlug);
      window.history.pushState(null, "", href);

      fetch_catalog_products_client({
        search: debouncedSearch.trim() || undefined,
        category: categorySlug,
        series: nextSeriesSlug,
        page: 1,
        per_page: 10,
        signal: controller.signal,
      })
        .then((response) => {
          if (requestId !== requestIdRef.current) {
            return;
          }

          setTableProducts(
            response.products.map(map_spec_parts_product_to_table_product)
          );
          setTablePage(response.page);
          setTableTotalPages(response.pages);
          window.scrollTo({ top: 0, behavior: "smooth" });
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          console.error("Catalog series switch failed:", error);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) {
            setIsPaging(false);
          }
        });
    },
    [debouncedSearch, categorySlug]
  );

  useEffect(() => {
    const query = debouncedSearch.trim();

    if (!query) {
      return;
    }

    if (skipInitialFetchRef.current && query === initialSearch.trim()) {
      skipInitialFetchRef.current = false;
      sync_catalog_search_query(pathname, query);
      return;
    }

    skipInitialFetchRef.current = false;

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    sync_catalog_search_query(pathname, query);
    setIsSearching(true);

    fetch_catalog_products_client({
      search: query,
      category: categorySlug,
      series: activeSeriesSlug,
      page: 1,
      per_page: 10,
      signal: controller.signal,
    })
      .then((response) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setTableProducts(
          response.products.map(map_spec_parts_product_to_table_product)
        );
        setTablePage(response.page);
        setTableTotalPages(response.pages);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Product search failed:", error);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setIsSearching(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [debouncedSearch, categorySlug, activeSeriesSlug, pathname, initialSearch]);

  const isPendingSearch =
    filter.trim() !== "" &&
    (filter.trim() !== debouncedSearch.trim() || isSearching);

  const visibleProducts = useMemo(() => {
    return filter_products_by_query(tableProducts, filter);
  }, [filter, tableProducts]);

  return {
    filter,
    handleFilterChange,
    handlePageChange,
    handleSeriesChange,
    activeSeriesSlug,
    visibleProducts,
    tablePage,
    tableTotalPages,
    isSearching,
    isPaging,
    isPendingSearch,
  };
}
