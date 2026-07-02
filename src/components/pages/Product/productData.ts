/**
 * File Name: productData.ts
 * Description: Temporary mock product data + lookup helpers for the listing and
 *              detail pages. Replace MOCK_PRODUCTS / HERO with API data later —
 *              keep the Product[] shape and getProductByPartNumber() signature.
 * Developer: pod2
 * Created Date: 2026-07-01
 * Last Modified: 2026-07-01
 */

import type { Product } from "./ProductTable";

export const HERO = {
  title: "Hex Cap Screws",
  description:
    "Made from Grade 5 steel, they're suitable for fastening most machinery and equipment. The cadmium plating provides good corrosion resistance to salt water. Length is measured from under the head.",
};

export const MOCK_PRODUCTS: Product[] = [
  { partNumber: "MS35307-303", sku: "S26114", description: "1/4-20 X 1/2 HEX CAP SCREW STAINLESS STEEL DFAR", pkgQty: 50, price1: "$57.78", price3: "$48.25", price5: "$42.15", price10: "$39.90", mfr: "STILLWATER", country: "USA", specHref: "#" },
  { partNumber: "MS35307-304", sku: "S26115", description: "1/4-20 X 9/16 HEX CAP SCREW STAINLESS STEEL DFAR", pkgQty: 50, price1: "$57.78", price3: "$48.25", price5: "$42.15", price10: "$39.90", mfr: "SUPERIOR", country: "USA", specHref: "#" },
  { partNumber: "MS35307-305", sku: "S26116", description: "1/4-20 X 5/8 HEX CAP SCREW STAINLESS STEEL DFAR", pkgQty: 50, price1: "$57.78", price3: "$48.25", price5: "$42.15", price10: "$39.90", mfr: "STILLWATER", country: "USA", specHref: "#" },
  { partNumber: "MS35307-306", sku: "S26117", description: "1/4-20 X 3/4 HEX CAP SCREW STAINLESS STEEL DFAR", pkgQty: 50, price1: "$57.78", price3: "$48.25", price5: "$42.15", price10: "$39.90", mfr: "STILLWATER", country: "USA / CANADA", specHref: "#" },
  { partNumber: "MS35307-307", sku: "S26118", description: "1/4-20 X 7/8 HEX CAP SCREW STAINLESS STEEL DFAR", pkgQty: 50, price1: "$57.78", price3: "$48.25", price5: "$42.15", price10: "$39.90", mfr: "STILLWATER", country: "USA / CANADA", specHref: "#" },
  { partNumber: "MS35307-308", sku: "S26119", description: "1/4-20 X 1 HEX CAP SCREW STAINLESS STEEL DFAR", pkgQty: 50, price1: "$57.78", price3: "$48.25", price5: "$42.15", price10: "$39.90", mfr: "STILLWATER", country: "USA / CANADA", specHref: "#" },
  { partNumber: "MS35307-309", sku: "S26120", description: "1/4-20 X 1-1/8 HEX CAP SCREW STAINLESS STEEL DFAR", pkgQty: 50, price1: "$57.78", price3: "$48.25", price5: "$42.15", price10: "$39.90", mfr: "STILLWATER", country: "USA", specHref: "#" },
  { partNumber: "MS35307-310", sku: "S26121", description: "1/4-20 X 1-1/4 HEX CAP SCREW STAINLESS STEEL DFAR", pkgQty: 50, price1: "$57.78", price3: "$48.25", price5: "$42.15", price10: "$39.90", mfr: "STILLWATER", country: "USA", specHref: "#" },
  { partNumber: "MS35307-311", sku: "S26122", description: "1/4-20 X 1-3/8 HEX CAP SCREW STAINLESS STEEL DFAR", pkgQty: 25, price1: "$57.78", price3: "$48.25", price5: "$42.15", price10: "$39.90", mfr: "STILLWATER", country: "USA / CANADA", specHref: "#" },
  { partNumber: "MS35307-313", sku: "S26123", description: "1/4-20 X 1-1/2 HEX CAP SCREW STAINLESS STEEL DFAR", pkgQty: 25, price1: "$57.78", price3: "$48.25", price5: "$42.15", price10: "$39.90", mfr: "STILLWATER", country: "USA", specHref: "#" },
  { partNumber: "MS35307-314", sku: "S26124", description: "1/4-20 X 1-3/4 HEX CAP SCREW STAINLESS STEEL DFAR", pkgQty: 25, price1: "$57.78", price3: "$48.25", price5: "$42.15", price10: "$39.90", mfr: "STILLWATER", country: "USA", specHref: "#" },
];

/** Find a product by its part number (case-insensitive). Returns undefined if not found. */
export function getProductByPartNumber(partNumber: string): Product | undefined {
  return MOCK_PRODUCTS.find(
    (p) => p.partNumber.toLowerCase() === partNumber.toLowerCase()
  );
}
