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
    <div className="container mx-auto py-10">
      {hasTitle ? <h1 className="mb-6 text-4xl font-bold">{title}</h1> : null}
      {hasContent ? (
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: content! }}
        />
      ) : null}
    </div>
  );
}
