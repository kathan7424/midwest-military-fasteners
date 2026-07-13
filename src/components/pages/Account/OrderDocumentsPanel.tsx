/**
 * File Name: OrderDocumentsPanel.tsx
 * Description: My Account — post-purchase spec sheets + product certificates.
 * Developer: KP-184
 * Created Date: 2026-07-07
 * Last Modified: 2026-07-13
 */

"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";
import { fetch_order_documents } from "@/services/order-documents.client";
import type { OrderDocumentsGroup } from "@/types/order-documents.types";
import {
  has_product_document,
  map_product_spec_href,
} from "@/utils/spec-parts.utils";
import { decodeHtmlEntities } from "@/utils/text.utils";
import { format_us_date } from "@/utils/date.utils";

type DocumentFilter = "all" | "spec" | "certificate";

/**
 * Forced-download link: cross-origin WP file URLs are routed through the
 * same-origin /api/download proxy (Content-Disposition: attachment), so the
 * browser downloads instead of opening a new tab.
 */
function DocumentDownloadLink({ fileUrl }: { fileUrl?: string | null }) {
  if (!has_product_document(fileUrl)) {
    return <span className="text-mid-gray">—</span>;
  }

  return (
    <a
      href={map_product_spec_href(fileUrl)}
      download
      className="inline-flex items-center gap-1.5 font-condensed text-sm font-bold uppercase text-amber hover:underline"
    >
      <Download className="size-4" />
      Download
    </a>
  );
}

/**
 * Spec sheets are product-level documents — the same product bought in two
 * orders has ONE spec sheet. Dedupe items across orders (orders come newest
 * first, so the first occurrence wins) and drop order groups left empty.
 * Certificates stay per-order: each order can carry its own certificate.
 */
function dedupe_spec_items(orders: OrderDocumentsGroup[]): OrderDocumentsGroup[] {
  const seen = new Set<string>();

  return orders
    .map((order) => ({
      ...order,
      items: order.items.filter((item) => {
        const doc_key =
          item.spec_file_url?.trim() || `${item.product_id}-${item.sku}`;
        if (seen.has(doc_key)) {
          return false;
        }
        seen.add(doc_key);
        return true;
      }),
    }))
    .filter((order) => order.items.length > 0);
}

export default function OrderDocumentsPanel({
  filter = "all",
}: {
  /** Limit the table to one document type (Certifications / Spec Sheets tabs). */
  filter?: DocumentFilter;
}) {
  const [orders, setOrders] = useState<OrderDocumentsGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch_order_documents()
      .then((response) => setOrders(response.orders))
      .catch(() => setError("Unable to load your purchased product documents."))
      .finally(() => setIsLoading(false));
  }, []);

  const showSpec = filter !== "certificate";
  const showCert = filter !== "spec";

  // With a single-type filter, hide orders that have none of that type.
  const filteredOrders =
    filter === "all"
      ? orders
      : orders
          .map((order) => ({
            ...order,
            items: order.items.filter((item) =>
              filter === "spec"
                ? has_product_document(item.spec_file_url)
                : has_product_document(item.certificate_file_url)
            ),
          }))
          .filter((order) => order.items.length > 0);

  const visibleOrders =
    filter === "spec" ? dedupe_spec_items(filteredOrders) : filteredOrders;

  if (isLoading) {
    const skeletonGroups = filter === "all" ? 2 : 1;
    return (
      <div className="space-y-6" aria-busy="true">
        {Array.from({ length: skeletonGroups }, (_, i) => (
          <div key={i}>
            <SkeletonBlock className="mb-3 h-5 w-40" />
            <div className="border border-light-gray">
              <div className="bg-navy px-4 py-3"><SkeletonBlock className="h-4 w-full max-w-[300px] bg-navy/50" /></div>
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex gap-4 border-t border-light-gray px-4 py-3">
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className="h-4 w-48" />
                  <SkeletonBlock className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-link text-red-600">{error}</p>;
  }

  if (!visibleOrders.length) {
    return (
      <p className="text-link text-dark-gray">
        {filter === "certificate"
          ? "No product certificates yet. Certificates are available after your order ships."
          : filter === "spec"
            ? "No spec sheets yet. Spec sheets appear here after your order is placed."
            : "No downloadable documents yet. Spec sheets are available after purchase; certificates after your order ships."}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {visibleOrders.map((order) => (
        <section key={order.order_id}>
          <h3 className="mb-4 text-label font-bold uppercase text-near-black">
            Order #{order.order_number}
            {order.order_date ? (
              <span className="ml-2 font-normal normal-case text-mid-gray">
                ({format_us_date(order.order_date)})
              </span>
            ) : null}
          </h3>

          <div className="overflow-x-auto border border-light-gray">
            <table className="w-full border-collapse text-link">
              <thead>
                <tr className="bg-navy text-left font-bold uppercase text-white">
                  <th className="px-4 py-3">Part #</th>
                  <th className="px-4 py-3">Description</th>
                  {showSpec ? <th className="px-4 py-3 text-center">Spec Sheet</th> : null}
                  {showCert ? <th className="px-4 py-3 text-center">Certificate</th> : null}
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={`${order.order_id}-${item.product_id}-${item.sku}`} className="border-t border-light-gray">
                    <td className="px-4 py-3 font-semibold text-amber">
                      {decodeHtmlEntities(item.sku)}
                    </td>
                    <td className="px-4 py-3 uppercase text-near-black">
                      {decodeHtmlEntities(item.name)}
                    </td>
                    {showSpec ? (
                      <td className="px-4 py-3 text-center">
                        <DocumentDownloadLink fileUrl={item.spec_file_url} />
                      </td>
                    ) : null}
                    {showCert ? (
                      <td className="px-4 py-3 text-center">
                        <DocumentDownloadLink fileUrl={item.certificate_file_url} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
