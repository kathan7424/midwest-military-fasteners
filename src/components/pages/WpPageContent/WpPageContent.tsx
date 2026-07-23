/**
 * File Name: WpPageContent.tsx
 * Description: WordPress CMS page content renderer.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-06
 */

import PageBanner from "@/components/shared_Ui/PageBanner";
import { MediaItem } from "@/types/site-settings.types";
import { hasHtmlContent, hasText } from "@/utils/content.utils";

interface WpPageContentProps {
  title?: string;
  content?: string;
  banner?: {
    heading: string;
    sub_heading: string;
    banner_image: MediaItem | null;
  } | null;
}

export default function WpPageContent({ title, content, banner }: WpPageContentProps) {
  // The banner already carries a resolved heading (page-title fallback baked
  // in server-side) — when it exists, it replaces the plain <h1> below so
  // the title isn't rendered twice.
  const hasBanner = Boolean(
    banner && (banner.heading || banner.sub_heading || banner.banner_image?.url)
  );
  const hasTitle = !hasBanner && hasText(title);
  const hasContent = hasHtmlContent(content);

  if (!hasBanner && !hasTitle && !hasContent) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-var(--header-height,140px)-var(--footer-height,48px))]">
      {hasBanner ? (
        <PageBanner
          heading={banner!.heading}
          subHeading={banner!.sub_heading}
          bannerImage={banner!.banner_image}
        />
      ) : null}
      <div className="container max-w-[1300px] mx-auto px-5 py-12">
        {hasTitle ? <h1 className="mb-10 text-[30px] font-black leading-[1.1] sm:text-[36px] md:text-[44px] lg:text-[52px] xl:text-[60px] font-bold">{title}</h1> : null}
        {hasContent ? (
          <div
             className="prose max-w-none section-content"
            dangerouslySetInnerHTML={{ __html: content! }}
          />
        ) : null}
      </div>
    </div>
  );
}
