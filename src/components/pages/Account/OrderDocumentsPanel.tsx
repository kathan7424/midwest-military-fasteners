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
      <svg width="90" height="16" viewBox="0 0 90 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M11.25 16H0V14.5H12V16H11.25ZM5.46875 11.7812L1.21875 7.53125L0.6875 7L1.75 5.9375L2.28125 6.46875L5.25 9.4375V0H6.75V9.4375L9.71875 6.46875L10.25 5.9375L11.3125 7L10.7812 7.53125L6.53125 11.7812L6 12.3125L5.46875 11.7812ZM27.8203 8.10938C27.8203 9.39062 27.6589 10.4688 27.3359 11.3438C27.013 12.2188 26.5365 12.8802 25.9062 13.3281C25.276 13.776 24.4974 14 23.5703 14H21.1016V2.57812H23.6953C24.5911 2.57812 25.3438 2.78906 25.9531 3.21094C26.5677 3.63281 27.0312 4.25521 27.3438 5.07812C27.6615 5.90104 27.8203 6.91146 27.8203 8.10938ZM26.0469 8.19531C26.0469 7.26823 25.9583 6.5 25.7812 5.89062C25.6042 5.28125 25.3385 4.82812 24.9844 4.53125C24.6302 4.22917 24.1875 4.07812 23.6562 4.07812H22.8203V12.4766H23.5391C24.4036 12.4766 25.0365 12.1224 25.4375 11.4141C25.8438 10.7005 26.0469 9.6276 26.0469 8.19531ZM36.9297 8.27344C36.9297 9.13281 36.8542 9.92188 36.7031 10.6406C36.5573 11.3594 36.3307 11.9818 36.0234 12.5078C35.7214 13.0339 35.3281 13.4401 34.8438 13.7266C34.3646 14.013 33.7943 14.1562 33.1328 14.1562C32.4609 14.1562 31.8828 14.0104 31.3984 13.7188C30.9141 13.4271 30.5182 13.0182 30.2109 12.4922C29.9036 11.9609 29.6771 11.3359 29.5312 10.6172C29.3854 9.89844 29.3125 9.11198 29.3125 8.25781C29.3125 6.96615 29.4557 5.88802 29.7422 5.02344C30.0286 4.15365 30.4557 3.5 31.0234 3.0625C31.5911 2.625 32.2943 2.40625 33.1328 2.40625C34.0182 2.40625 34.7396 2.65365 35.2969 3.14844C35.8594 3.64323 36.2708 4.33333 36.5312 5.21875C36.7969 6.09896 36.9297 7.11719 36.9297 8.27344ZM31.0938 8.27344C31.0938 9.22656 31.1693 10.026 31.3203 10.6719C31.4766 11.3177 31.7057 11.8047 32.0078 12.1328C32.3099 12.4609 32.6823 12.625 33.125 12.625C33.5729 12.625 33.9453 12.4661 34.2422 12.1484C34.5391 11.8255 34.763 11.3438 34.9141 10.7031C35.0651 10.0573 35.1406 9.2474 35.1406 8.27344C35.1406 6.82031 34.9714 5.73177 34.6328 5.00781C34.2995 4.28385 33.7995 3.92188 33.1328 3.92188C32.6797 3.92188 32.3021 4.08594 32 4.41406C31.6979 4.74219 31.4714 5.22917 31.3203 5.875C31.1693 6.51562 31.0938 7.3151 31.0938 8.27344ZM49.5156 2.57812L47.2188 14H45.2266L43.9531 7.54688C43.9271 7.40104 43.8984 7.23958 43.8672 7.0625C43.8411 6.88542 43.8125 6.69531 43.7812 6.49219C43.7552 6.28385 43.7266 6.0625 43.6953 5.82812C43.6693 5.58854 43.6432 5.33333 43.6172 5.0625C43.5964 5.25521 43.5729 5.45573 43.5469 5.66406C43.526 5.86719 43.5 6.07552 43.4688 6.28906C43.4427 6.4974 43.4115 6.70833 43.375 6.92188C43.3438 7.13021 43.3099 7.33333 43.2734 7.53125L42.0078 14H40.0312L37.7109 2.57812H39.4141L40.6562 9.07812C40.7031 9.33333 40.7474 9.59115 40.7891 9.85156C40.8307 10.112 40.8698 10.3724 40.9062 10.6328C40.9479 10.888 40.9844 11.1328 41.0156 11.3672C41.0469 11.5964 41.0729 11.8099 41.0938 12.0078C41.125 11.763 41.1589 11.5104 41.1953 11.25C41.2318 10.9896 41.2708 10.7344 41.3125 10.4844C41.3542 10.2292 41.3958 9.98438 41.4375 9.75C41.4792 9.51562 41.5182 9.30208 41.5547 9.10938L42.8672 2.57812H44.375L45.6406 9.09375C45.6823 9.29688 45.724 9.51562 45.7656 9.75C45.8073 9.97917 45.8464 10.2188 45.8828 10.4688C45.9193 10.7135 45.9557 10.9661 45.9922 11.2266C46.0286 11.4818 46.0625 11.7422 46.0938 12.0078C46.1302 11.6849 46.1719 11.3542 46.2188 11.0156C46.2656 10.6771 46.3151 10.3438 46.3672 10.0156C46.4245 9.68229 46.4792 9.36979 46.5312 9.07812L47.7969 2.57812H49.5156ZM57.9453 14H55.8984L52.2344 5.28906H52.1719C52.1979 5.61198 52.2188 5.91927 52.2344 6.21094C52.25 6.5026 52.2604 6.77604 52.2656 7.03125C52.276 7.28646 52.2812 7.52604 52.2812 7.75V14H50.6641V2.57812H52.6953L56.3594 11.125H56.4141C56.3932 10.7917 56.375 10.4818 56.3594 10.1953C56.349 9.90365 56.3385 9.63281 56.3281 9.38281C56.3229 9.1276 56.3203 8.89583 56.3203 8.6875V2.57812H57.9453V14ZM60.1328 14V2.57812H61.8516V12.4766H64.9688V14H60.1328ZM73.5859 8.27344C73.5859 9.13281 73.5104 9.92188 73.3594 10.6406C73.2135 11.3594 72.987 11.9818 72.6797 12.5078C72.3776 13.0339 71.9844 13.4401 71.5 13.7266C71.0208 14.013 70.4505 14.1562 69.7891 14.1562C69.1172 14.1562 68.5391 14.0104 68.0547 13.7188C67.5703 13.4271 67.1745 13.0182 66.8672 12.4922C66.5599 11.9609 66.3333 11.3359 66.1875 10.6172C66.0417 9.89844 65.9688 9.11198 65.9688 8.25781C65.9688 6.96615 66.112 5.88802 66.3984 5.02344C66.6849 4.15365 67.112 3.5 67.6797 3.0625C68.2474 2.625 68.9505 2.40625 69.7891 2.40625C70.6745 2.40625 71.3958 2.65365 71.9531 3.14844C72.5156 3.64323 72.9271 4.33333 73.1875 5.21875C73.4531 6.09896 73.5859 7.11719 73.5859 8.27344ZM67.75 8.27344C67.75 9.22656 67.8255 10.026 67.9766 10.6719C68.1328 11.3177 68.362 11.8047 68.6641 12.1328C68.9661 12.4609 69.3385 12.625 69.7812 12.625C70.2292 12.625 70.6016 12.4661 70.8984 12.1484C71.1953 11.8255 71.4193 11.3438 71.5703 10.7031C71.7214 10.0573 71.7969 9.2474 71.7969 8.27344C71.7969 6.82031 71.6276 5.73177 71.2891 5.00781C70.9557 4.28385 70.4557 3.92188 69.7891 3.92188C69.3359 3.92188 68.9583 4.08594 68.6562 4.41406C68.3542 4.74219 68.1276 5.22917 67.9766 5.875C67.8255 6.51562 67.75 7.3151 67.75 8.27344ZM80.25 14L79.5234 10.7891H76.8984L76.1719 14H74.3281L77.0938 2.57812H79.2656L82.0781 14H80.25ZM79.2344 9.25781L78.4922 5.8125C78.4505 5.58854 78.4115 5.3724 78.375 5.16406C78.3385 4.95052 78.3047 4.74479 78.2734 4.54688C78.2422 4.34896 78.2135 4.15885 78.1875 3.97656C78.1719 4.15365 78.1484 4.34115 78.1172 4.53906C78.0911 4.73698 78.0573 4.9401 78.0156 5.14844C77.9792 5.35677 77.9375 5.57031 77.8906 5.78906L77.1641 9.25781H79.2344ZM89.8984 8.10938C89.8984 9.39062 89.737 10.4688 89.4141 11.3438C89.0911 12.2188 88.6146 12.8802 87.9844 13.3281C87.3542 13.776 86.5755 14 85.6484 14H83.1797V2.57812H85.7734C86.6693 2.57812 87.4219 2.78906 88.0312 3.21094C88.6458 3.63281 89.1094 4.25521 89.4219 5.07812C89.7396 5.90104 89.8984 6.91146 89.8984 8.10938ZM88.125 8.19531C88.125 7.26823 88.0365 6.5 87.8594 5.89062C87.6823 5.28125 87.4167 4.82812 87.0625 4.53125C86.7083 4.22917 86.2656 4.07812 85.7344 4.07812H84.8984V12.4766H85.6172C86.4818 12.4766 87.1146 12.1224 87.5156 11.4141C87.9219 10.7005 88.125 9.6276 88.125 8.19531Z" fill="currentColor"/> </svg>
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
