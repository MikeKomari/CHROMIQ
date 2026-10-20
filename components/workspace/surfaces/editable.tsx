import { createElement, type ReactNode } from "react";
import type { Mode, Tokens } from "@/types/workspace";

export type SurfaceProps = {
  tokens: Tokens;
  variant: "a" | "b" | "single";
  mode?: Mode;
};

type EditableTag =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "p"
  | "span"
  | "div"
  | "strong"
  | "small"
  | "blockquote"
  | "li"
  | "figcaption";

/** Text that can be edited in place. Edits are local to the DOM node. */
export function Ed({
  as = "span",
  className = "",
  label = "Editable preview text",
  children,
}: {
  as?: EditableTag;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  return createElement(
    as,
    {
      className: `sf-edit ${className}`.trim(),
      contentEditable: true,
      role: "textbox",
      "aria-label": label,
      "aria-multiline": as === "p" || as === "blockquote" || as === "div" || as === "li" ? true : undefined,
      suppressContentEditableWarning: true,
      spellCheck: false,
    },
    children,
  );
}
