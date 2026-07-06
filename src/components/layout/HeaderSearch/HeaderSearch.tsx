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
      className="hidden lg:flex flex-1 max-w-[732px] w-full items-center"
    >
      <div className="flex w-full">
        <input
          type="search"
          name="q"
          placeholder="Search by part # or keywords"
          className="flex-1 px-4 py-3.5 text-link text-near-black placeholder:text-link placeholder:text-mid-gray outline-none bg-white border border-navy border-r-0 rounded-none h-12"
        />
        <button
          type="submit"
          className="px-4 py-3.5 bg-amber text-white hover:bg-amber/90 transition-colors rounded-none h-12"
          aria-label="Search"
        >
          <FaMagnifyingGlass size={16} />
        </button>
      </div>
    </form>
  );
}
