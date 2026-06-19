/**
 * File Name: WpPageContent.tsx
 * Description:
 * Developer: KP-184
 * Created Date: 2026-06-19
 * Last Modified: 2026-06-19
 */

interface WpPageContentProps {
  title: string;
  content?: string;
}

export default function WpPageContent({ title, content }: WpPageContentProps) {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-6">{title}</h1>
      {content ? (
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : null}
    </div>
  );
}
