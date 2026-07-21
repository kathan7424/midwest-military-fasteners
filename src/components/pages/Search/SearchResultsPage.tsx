/**
 * File Name: SearchResultsPage.tsx
 * Description: WordPress-standard site search results (?s=) — mixed
 *              posts/pages/products, matching how WP's own search.php
 *              template renders results, independent of the product catalog.
 * Developer: KP-184
 * Created Date: 2026-07-21
 */

import Link from "next/link";

import SearchRetryForm from "@/components/pages/Search/SearchRetryForm";
import type { SearchApiResponse } from "@/types/search.types";
import { get_search_taxonomy_label } from "@/utils/search.utils";
import { decodeHtmlEntities } from "@/utils/text.utils";
import { normalizeWpUrl } from "@/utils/url.utils";

interface SearchResultsPageProps {
  query: string;
  results: SearchApiResponse;
}

const TYPE_LABELS: Record<string, string> = {
  product: "Product",
  page: "Page",
  post: "Article",
};

export default function SearchResultsPage({
  query,
  results,
}: SearchResultsPageProps) {
  const { posts, terms, total } = results;
  const hasQuery = query.length > 0;
  const hasResults = posts.length > 0 || terms.length > 0;

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-10 xl:py-14">
      <p className="mb-2 text-label font-bold uppercase text-mid-gray">
        Search Results
      </p>
      <h1 className="mb-6 text-h2 font-bold leading-heading text-near-black">
        {!hasQuery ? (
          "Search Midwest Military Fasteners"
        ) : (
          <>
            Search: <span className="text-blue">&ldquo;{query}&rdquo;</span>
          </>
        )}
      </h1>

      {!hasQuery ? (
        <>
          <p className="text-link text-near-black">
            Type a part number, keyword, or category name below to get
            started.
          </p>
          <SearchRetryForm />
        </>
      ) : !hasResults ? (
        <>
          <p className="text-link text-near-black">
            We could not find any results for your search. Give it another
            try below — a different part number, keyword, or category name
            often turns something up.
          </p>
          <SearchRetryForm initialQuery={query} />
        </>
      ) : (
        <>
          <p className="mb-6 text-link text-mid-gray">
            {total.posts} result{total.posts === 1 ? "" : "s"} found
          </p>

          {terms.length > 0 ? (
            <div className="mb-8 flex flex-wrap gap-2">
              {terms.map((term) => (
                <Link
                  key={`${term.taxonomy}-${term.id}`}
                  href={normalizeWpUrl(term.url)}
                  className="flex items-center gap-1.5 border border-blue px-3 py-1.5 text-sm font-semibold text-blue transition-colors hover:bg-blue hover:text-white"
                >
                  <span className="text-xs font-normal uppercase opacity-70">
                    {get_search_taxonomy_label(term.taxonomy)}
                  </span>
                  {decodeHtmlEntities(term.name)}
                </Link>
              ))}
            </div>
          ) : null}

          <ul className="flex flex-col divide-y divide-light-gray border-y border-light-gray">
            {posts.map((post) => (
              <li key={`${post.type}-${post.id}`} className="py-5">
                <span className="mb-1.5 inline-block text-label font-bold uppercase text-amber">
                  {TYPE_LABELS[post.type] ?? post.type}
                </span>

                <Link
                  href={normalizeWpUrl(post.url)}
                  className="block text-h5 font-bold text-near-black hover:text-blue"
                >
                  {decodeHtmlEntities(post.title)}
                </Link>

                {post.product ? (
                  <p className="mt-1 text-link text-mid-gray">
                    {post.product.sku ? `SKU: ${post.product.sku}` : null}
                    {post.product.sku && post.product.price_html ? " — " : null}
                    {post.product.price_html ? (
                      <span
                        className="font-semibold text-near-black"
                        dangerouslySetInnerHTML={{
                          __html: post.product.price_html,
                        }}
                      />
                    ) : null}
                    {post.product.in_stock ? null : (
                      <span className="ml-2 text-red-600">Out of stock</span>
                    )}
                  </p>
                ) : null}

                {post.excerpt ? (
                  <p className="mt-2 max-w-[720px] text-link text-near-black">
                    {decodeHtmlEntities(post.excerpt)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
