/**
 * File Name: PageRouteLoading.tsx
 * Description: Route-transition skeletons matched to real page layouts.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import CartPageSkeleton from "@/components/shared_Ui/skeletons/CartPageSkeleton";
import CatalogPageSkeleton from "@/components/shared_Ui/skeletons/CatalogPageSkeleton";
import ProductDetailSkeleton from "@/components/shared_Ui/skeletons/ProductDetailSkeleton";

export type PageRouteLoadingVariant =
  | "catalog"
  | "product-detail"
  | "cart";

interface PageRouteLoadingProps {
  variant?: PageRouteLoadingVariant;
}

export default function PageRouteLoading({
  variant = "catalog",
}: PageRouteLoadingProps) {
  switch (variant) {
    case "product-detail":
      return <ProductDetailSkeleton />;
    case "cart":
      return <CartPageSkeleton />;
    case "catalog":
    default:
      return <CatalogPageSkeleton />;
  }
}
