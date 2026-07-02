/**
 * File Name: page.tsx
 * Description: Route for a single product detail page
 *              (/product/[series]/[partNumber], e.g. /product/MS35307/MS35307-303).
 * Developer: pod2
 * Created Date: 2026-07-01
 * Last Modified: 2026-07-01
 */

import { notFound } from "next/navigation";

import { ProductDetailPage } from "@/components/pages/ProductDetail";
import { getProductByPartNumber } from "@/components/pages/Product/productData";

type Props = {
  params: Promise<{
    series: string;
    partNumber: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { series, partNumber } = await params;

  const product = getProductByPartNumber(partNumber);

  if (!product) {
    notFound();
  }

  return <ProductDetailPage series={series} product={product} />;
}
