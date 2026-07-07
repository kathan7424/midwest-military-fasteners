/**
 * File Name: cartData.ts
 * Description: Mock header cart data and count used by the header cart preview.
 * Developer: Jaimin
 * Created Date: 2026-07-06
 * Last Modified: 2026-07-06
 */

export const CART_ITEMS = [
  {
    id: 1,
    partNumber: "MS35307-303",
    qty: 2,
    price: "$115.56",
  },
  {
    id: 2,
    partNumber: "MS35307-303",
    qty: 2,
    price: "$115.56",
  },
  {
    id: 3,
    partNumber: "MS35307-303",
    qty: 2,
    price: "$115.56",
  },
];

export const CART_COUNT = CART_ITEMS.length;