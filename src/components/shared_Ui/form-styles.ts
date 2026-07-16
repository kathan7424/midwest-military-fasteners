/**
 * File Name: form-styles.ts
 * Description: Shared Tailwind class constants for all non-auth forms
 *   (Checkout, My Account, Tax upload). Auth forms (Login/Register) use
 *   the Untitled UI base Input component — do NOT apply these there.
 */

/** Full-width bordered input: text, email, tel, password, textarea */
export const INPUT_CLASS =
  "w-full border border-light-gray bg-white px-4 py-3 text-link text-near-black outline-none transition-colors focus:border-blue";

/** Appended to INPUT_CLASS when the field has a validation error */
export const INPUT_ERROR_CLASS = "border-red-400";

/** Select fields — adds dropdown arrow, keeps INPUT_CLASS base */
export const SELECT_CLASS =
  "w-full appearance-none border border-light-gray bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%23343a40%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m2%205%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_16px_center] bg-[size:16px] bg-no-repeat px-4 py-3 pr-10 text-link text-near-black outline-none transition-colors focus:border-blue";

/** Field label above inputs */
export const LABEL_CLASS = "mb-1.5 block text-sm font-semibold text-near-black";

/** Inline error text below a field */
export const FIELD_ERROR_CLASS = "mt-1 text-xs text-red-600";

/** Required asterisk span */
export const REQUIRED_STAR_CLASS = "ml-0.5 text-[#E12222]";
