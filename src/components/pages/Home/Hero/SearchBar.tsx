"use client";

<<<<<<< HEAD
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

import SearchDropdown from "./SearchDropdown";
import {
  SEARCH_PLACEHOLDER,
  SEARCH_SUGGESTIONS,
} from "./heroData";
import { SearchBarProps } from "./types";
=======
/**
 * File Name: SearchBar.tsx
 * Description: Home hero search input with suggestions dropdown.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-26
 */

import { useEffect, useRef, useState } from "react";
import { FaMagnifyingGlass } from "react-icons/fa6";

import SearchDropdown from "@/components/pages/Home/Hero/SearchDropdown";
import {
  SEARCH_PLACEHOLDER,
  SEARCH_SUGGESTIONS,
} from "@/data/hero.data";
import { SearchBarProps } from "@/types/hero.types";
>>>>>>> upstream/dev

export default function SearchBar({
  placeholder = SEARCH_PLACEHOLDER,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
<<<<<<< HEAD

=======
>>>>>>> upstream/dev
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredSuggestions = SEARCH_SUGGESTIONS.filter((item) => {
    const value = query.toLowerCase();

    return (
      item.code.toLowerCase().includes(value) ||
      item.title.toLowerCase().includes(value)
    );
  });

  return (
<<<<<<< HEAD
    <div ref={wrapperRef} className="relative mx-auto w-full max-w-[800px]" >
      <div className="flex overflow-hidden bg-white shadow-lg">
        <input type="text" value={query} placeholder={placeholder} onFocus={() => setIsOpen(true)} onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }} className="min-w-0 flex-1 border border-navy h-14 sm:h-16 lg:h-[72px] px-4 sm:px-6 lg:px-8 text-base sm:text-lg lg:text-[24px] font-normal text-near-black placeholder:text-mid-gray placeholder:text-base sm:placeholder:text-lg lg:placeholder:text-[24px] focus:outline-none focus:border-b-transparent" />
        <button type="button" aria-label="Search" className=" flex h-14 w-14 shrink-0 items-center justify-center bg-blue text-white transition-colors duration-300 hover:bg-navy sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px] " > <FontAwesomeIcon icon={faMagnifyingGlass} className="text-lg sm:text-xl lg:text-2xl" /> </button>
=======
    <div ref={wrapperRef} className="relative mx-auto w-full max-w-[800px]">
      <div className="flex overflow-hidden bg-white shadow-lg">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          className="h-14 min-w-0 flex-1 border border-navy px-4 text-base font-normal text-near-black placeholder:text-base placeholder:text-mid-gray focus:border-b-transparent focus:outline-none sm:h-16 sm:px-6 sm:text-lg sm:placeholder:text-lg lg:h-[72px] lg:px-8 lg:text-[24px] lg:placeholder:text-[24px]"
        />
        <button
          type="button"
          aria-label="Search"
          className="flex h-14 w-14 shrink-0 items-center justify-center bg-blue text-white transition-colors duration-300 hover:bg-navy sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px]"
        >
          <FaMagnifyingGlass className="text-lg sm:text-xl lg:text-2xl" />
        </button>
>>>>>>> upstream/dev
      </div>
      <SearchDropdown isOpen={isOpen} suggestions={filteredSuggestions} />
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> upstream/dev
