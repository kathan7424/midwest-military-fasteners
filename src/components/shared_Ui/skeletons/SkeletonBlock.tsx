/**
 * File Name: SkeletonBlock.tsx
 * Description: Base pulse block for route loading skeletons.
 * Developer: KP-184
 * Created Date: 2026-07-07
 */

import { cn } from "@/lib/utils";

interface SkeletonBlockProps {
  className?: string;
}

export default function SkeletonBlock({ className }: SkeletonBlockProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-sm bg-light-gray/80", className)}
    />
  );
}
