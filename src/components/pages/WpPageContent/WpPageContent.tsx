/**
 * File Name: WpPageContent.tsx
 * Description: WordPress CMS page content renderer.
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-07-06
 */

import { hasHtmlContent, hasText } from "@/utils/content.utils";

interface WpPageContentProps {
  title?: string;
  content?: string;
}

export default function WpPageContent({ title, content }: WpPageContentProps) {
  const hasTitle = hasText(title);
  const hasContent = hasHtmlContent(content);

  if (!hasTitle && !hasContent) {
    return null;
  }

  return (
    <div className="container max-w-[1300px] mx-auto px-5 py-12">
      {hasTitle ? <h1 className="mb-10 text-[30px] font-black leading-[1.1] sm:text-[36px] md:text-[44px] lg:text-[52px] xl:text-[60px] font-bold">{title}</h1> : null}
      {hasContent ? (
        <div
           className="prose max-w-none section-content"
          dangerouslySetInnerHTML={{ __html: content! }}
        />
      ) : null}
    </div>
  );
}
