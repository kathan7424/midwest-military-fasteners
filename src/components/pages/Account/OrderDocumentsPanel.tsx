/**
 * File Name: OrderDocumentsPanel.tsx
 * Description: My Account — post-purchase spec sheets + product certificates.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { fetch_order_documents } from "@/services/order-documents.client";
import type { OrderDocumentsGroup } from "@/types/order-documents.types";
import { has_product_document } from "@/utils/spec-parts.utils";

export default function OrderDocumentsPanel() {
  const [orders, setOrders] = useState<OrderDocumentsGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch_order_documents()
      .then((response) => setOrders(response.orders))
      .catch(() => setError("Unable to load your purchased product documents."))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <p className="text-link text-dark-gray">Loading your documents...</p>;
  }

  if (error) {
    return <p className="text-link text-red-600">{error}</p>;
  }

  if (!orders.length) {
    return (
      <p className="text-link text-dark-gray">
        No downloadable spec sheets or product certificates yet. Documents appear here
        after your order is placed.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {orders.map((order) => (
        <section key={order.order_id}>
          <h3 className="mb-4 text-label font-bold uppercase text-near-black">
            Order #{order.order_number}
            {order.order_date ? (
              <span className="ml-2 font-normal normal-case text-mid-gray">
                ({order.order_date})
              </span>
            ) : null}
          </h3>

          <div className="overflow-x-auto border border-light-gray">
            <table className="w-full border-collapse text-link">
              <thead>
                <tr className="bg-navy text-left font-bold uppercase text-white">
                  <th className="px-4 py-3">Part #</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-center">Spec Sheet</th>
                  <th className="px-4 py-3 text-center">Certificate</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={`${order.order_id}-${item.product_id}-${item.sku}`} className="border-t border-light-gray">
                    <td className="px-4 py-3 font-semibold text-amber">{item.sku}</td>
                    <td className="px-4 py-3 uppercase text-near-black">{item.name}</td>
                    <td className="px-4 py-3 text-center">
                      {has_product_document(item.spec_file_url) ? (
                        <a
                          href={item.spec_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-condensed text-sm font-bold uppercase text-amber hover:underline"
                        >
                          <Download className="size-4" />
                          Download
                        </a>
                      ) : (
                        <span className="text-mid-gray">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {has_product_document(item.certificate_file_url) ? (
                        <a
                          href={item.certificate_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-condensed text-sm font-bold uppercase text-amber hover:underline"
                        >
                          <Download className="size-4" />
                          Download
                        </a>
                      ) : (
                        <span className="text-mid-gray">—</span>
                      )}
                    </td>
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
