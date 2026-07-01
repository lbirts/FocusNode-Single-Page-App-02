export const PROPERTIES = [
  "direction",
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontFamily",
  "textAlign",
  "textTransform",
  "textIndent",
  "wordSpacing",
  "tabSize",
  "whiteSpace",
  "wordBreak",
  "overflowWrap",
] as const;

export type MirroredProperty = (typeof PROPERTIES)[number];

type Indexable = Record<string, string>;

export function mirror(source: HTMLTextAreaElement, target: HTMLElement): void {
  const computed = window.getComputedStyle(source) as unknown as Indexable;
  const style = target.style as unknown as Indexable;
  for (let i = 0; i < PROPERTIES.length; i++) {
    const key = PROPERTIES[i];
    style[key] = computed[key];
  }
  style.lineHeight = computed.lineHeight;
  style.whiteSpace = "pre-wrap";
  style.overflowWrap = "break-word";
  style.letterSpacing = computed.letterSpacing;
}

export function syncScroll(
  source: HTMLTextAreaElement,
  target: HTMLElement,
): void {
  target.scrollTop = source.scrollTop;
  target.scrollLeft = source.scrollLeft;
}
