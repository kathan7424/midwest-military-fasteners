/**
 * File Name: HeaderSearch.tsx
 * Description: Header product search form.
 * Developer: KP-184
 * Created Date: 2026-06-25
 * Last Modified: 2026-06-25
 */

import { FaMagnifyingGlass } from "react-icons/fa6";

export default function HeaderSearch() {
  return (
    <form
      action="/catalog"
      method="GET"
      className="hidden lg:flex flex-1 max-w-xl items-center"
    >
      <div className="flex w-full border border-light-gray rounded overflow-hidden">
        <input
          type="search"
          name="q"
          placeholder="Search by part # or keywords"
          className="flex-1 px-4 py-2 text-sm text-near-black placeholder:text-mid-gray outline-none bg-white"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-amber text-white hover:bg-amber/90 transition-colors"
          aria-label="Search"
        >
          <FaMagnifyingGlass size={16} />
        </button>
      </div>
    </form>
  );
}
