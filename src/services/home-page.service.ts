import { fetchWpJson } from "@/services/wp-api.service";
import { HomePageData } from "@/types/home-page.types";

export async function fetchHomePage(): Promise<HomePageData> {
  return fetchWpJson<HomePageData>("/custom/v1/home-page");
}