"use client";

import {
  type CSSProperties,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from "react";
import { mirror, syncScroll } from "./core";

export type RichTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  render: (value: string) => ReactNode;
  className?: string;
  style?: CSSProperties;
  rows?: number;
  placeholder?: string;
  "data-testid"?: string;
};

export function RichTextarea({
  value,
  onChange,
  render,
  className,
  style,
  rows,
  placeholder,
  ...rest
}: RichTextareaProps) {
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const source = sourceRef.current;
    const backdrop = backdropRef.current;
    if (!source || !backdrop) return;
    const sync = () => {
      mirror(source, backdrop);
      syncScroll(source, backdrop);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(source);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative">
      <div
        ref={backdropRef}
        aria-hidden
        data-testid="richtext-backdrop"
        className="pointer-events-none absolute inset-0 overflow-hidden text-transparent"
      >
        {render(value)}
      </div>
      <textarea
        ref={sourceRef}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onScroll={() => {
          const source = sourceRef.current;
          const backdrop = backdropRef.current;
          if (source && backdrop) syncScroll(source, backdrop);
        }}
        className={className}
        style={{ ...style, position: "relative", background: "transparent" }}
        {...rest}
      />
    </div>
  );
}
