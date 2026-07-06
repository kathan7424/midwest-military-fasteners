export interface YoastOgImage {
    url: string;
    width?: number;
    height?: number;
    type?: string;
  }
  
  export interface YoastHeadJson {
    title: string;
    description: string;
    canonical: string;
    og_title?: string;
    og_description?: string;
    og_image?: YoastOgImage[];
    robots?: {
      index: string;
      follow: string;
    };
    schema?: Record<string, unknown>;
  }
  
  export interface YoastHeadResponse {
    html: string;
    json: YoastHeadJson;
    status: number;
  }
  
  export interface WpPageWithYoast {
    id: number;
    slug: string;
    title: { rendered: string };
    content: { rendered: string };
    yoast_head_json?: YoastHeadJson;
  }