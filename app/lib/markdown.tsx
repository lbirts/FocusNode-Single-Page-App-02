import { cn } from "@/app/lib/utils";
import Markdown from "markdown-to-jsx";

const OVERRIDES = {
  a: {
    props: {
      "data-testid": "comment-link",
      className: "break-words text-brand underline",
      target: "_blank",
      rel: "noreferrer",
    },
  },
  p: { props: { className: "break-words" } },
  code: {
    props: {
      className:
        "rounded bg-primary-100 px-1 py-0.5 font-mono text-[12px] text-primary-600",
    },
  },
  pre: {
    props: {
      "data-testid": "comment-code",
      className:
        "overflow-x-auto rounded-lg bg-primary-100 p-2 font-mono text-[12px] text-primary-600",
    },
  },
  ul: { props: { className: "ml-4 list-disc" } },
  ol: { props: { className: "ml-4 list-decimal" } },
  blockquote: {
    props: {
      className: "border-l-2 border-primary-200 pl-2 text-primary-400",
    },
  },
  strong: { props: { className: "font-semibold text-primary-600" } },
};

export function CommentMarkdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-sm text-primary-600 [&_p]:mb-1 [&_p:last-child]:mb-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        className,
      )}
    >
      <Markdown options={{ forceBlock: true, overrides: OVERRIDES }}>
        {children}
      </Markdown>
    </div>
  );
}
