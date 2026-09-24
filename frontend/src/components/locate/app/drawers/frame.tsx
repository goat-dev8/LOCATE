"use client";

/**
 * LOCATE drawers — shared right-side sheet scaffold so every action flow
 * (take / return / claim / list / cancel) reads identically: mono eyebrow,
 * ink id, cream body, footer confirm bar.
 */

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

export function ActionDrawer({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 rounded-l-3xl border-l-0 bg-cream p-0 shadow-[0_24px_64px_-24px_rgba(26,24,21,0.4)] sm:max-w-md"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-5 pr-12">
          <div className="flex flex-col gap-1.5">
            <SheetTitle className="lc-label text-left">{eyebrow}</SheetTitle>
            <span className="font-mono text-sm font-bold tracking-tight text-ink">
              {title}
            </span>
          </div>
        </div>
        <SheetDescription className="sr-only">{description}</SheetDescription>
        <div className="lc-scroll flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
        {footer && (
          <div className="border-t border-line bg-cream px-5 py-4">{footer}</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
