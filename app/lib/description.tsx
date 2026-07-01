import { cn } from "@/app/lib/utils";
import type { ReactNode } from "react";

export const DESCRIPTION_TOKEN = /([@#][\w-]+)/g;

export function renderDescription(
  value: string,
  opts?: { transparent?: boolean },
): ReactNode {
  const textClass = opts?.transparent ? "text-transparent" : "text-inherit";
  return value.split(DESCRIPTION_TOKEN).map((part, i) => {
    if (/^#[\w-]+$/.test(part))
      return (
        <mark
          key={i}
          data-testid="description-token"
          className={cn("rounded bg-brand-light", textClass)}
        >
          {part}
        </mark>
      );
    if (/^@[\w-]+$/.test(part))
      return (
        <mark
          key={i}
          data-testid="description-token"
          className={cn("rounded bg-secondary-50", textClass)}
        >
          {part}
        </mark>
      );
    return <span key={i}>{part}</span>;
  });
}
