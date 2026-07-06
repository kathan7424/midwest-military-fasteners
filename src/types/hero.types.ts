/**
 * File Name: hero.types.ts
 * Description: Home hero component types.
 * Developer: KP-184
 * Created Date: 2026-06-26
 * Last Modified: 2026-06-26
 */

export interface SearchSuggestion {
  id: number;
  code: string;
  title: string;
  url: string;
}

export interface SearchBarProps {
  placeholder?: string;
}

export interface SearchDropdownProps {
  suggestions: SearchSuggestion[];
  isOpen: boolean;
  isLoading?: boolean;
}
