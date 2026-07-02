export interface SearchSuggestion {
  id: number;
  code: string;
  title: string;
}

export interface SearchBarProps {
  placeholder?: string;
}

export interface SearchDropdownProps {
  suggestions: SearchSuggestion[];
  isOpen: boolean;
}

export interface HeroProps {
  title?: string;
  backgroundImage?: string;
}