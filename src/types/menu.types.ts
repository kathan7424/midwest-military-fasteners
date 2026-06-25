/**
 * File Name: menu.types.ts
 * Description: 
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

export interface MenuItem {
  id: number;
  title: string;
  slug: string;
  url: string;
  type: string;
  parent: number;
}

export interface FooterMenuItem {
  id: number;
  title: string;
  url: string;
  parent: number;
  children: FooterMenuItem[];
}