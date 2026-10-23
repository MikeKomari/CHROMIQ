"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ColorPicker } from "@/components/ui/color-picker";
import { fontCatalog } from "@/data/workspace";
import {
  colorRoleVars,
  describeElement,
  elementTokens,
  tokenColor,
  type ColorRole,
  type ElementTokenMatch,
} from "@/lib/element-tokens";
import { loadFontFamily } from "@/lib/fonts";
import { themeRoleLabels } from "@/lib/theme";
import type { Mode, TokenUpdate, Tokens } from "@/types/workspace";

type ColorMatch = Extract<ElementTokenMatch, { kind: "color" }>;
type FontMatch = Extract<ElementTokenMatch, { kind: "font" }>;

const roleLabels: Record<ColorRole, string> = {
  ...themeRoleLabels,
  onAccent: "Label on accent (derived)",
  success: "Success",
  warning: "Warning",
  danger: "Danger",
};

const propertyLabels = { background: "background", text: "text", border: "border" } as const;
const fontVars = {
  display: "--chromiq-font-display",
  body: "--chromiq-font-body",
  mono: "--chromiq-font-mono",
} as const;
const GAP = 12;
const EDGE = 8;

type Notice = "variant-b" | "shared" | null;

export function TokenPopover({
  element,
  tokens,
  mode,
  notice,
  container,
  frame,
  updateTokens,
  onClose,
}: {
  element: HTMLElement;
  tokens: Tokens;
  mode: Mode;
  /** Why the popover is view-only, or null when it can edit. */
  notice: Notice;
  container: HTMLElement;
  frame: HTMLElement;
  updateTokens: TokenUpdate;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;
  const [matches, setMatches] = useState<ElementTokenMatch[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const editable = notice === null;
  const description = describeElement(element);

  // Matches are inferred once per selection. Rows then read live values from the tokens, so a
  // color edit never makes its own row (or the open picker) disappear mid-transition.
  useLayoutEffect(() => {
    setMatches(elementTokens(element, tokensRef.current, mode));
    setOpen(null);
  }, [element, mode]);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [element]);

  const place = () => {
    const popover = ref.current;
    if (!popover || !element.isConnected) return;
    const box = container.getBoundingClientRect();
    const target = element.getBoundingClientRect();
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    let left = target.right + GAP;
    if (left + width > box.right - EDGE) left = target.left - GAP - width;
    if (left < box.left + EDGE) left = Math.min(target.left, box.right - EDGE - width);
    let top = target.top;
    if (top + height > box.bottom - EDGE) top = box.bottom - EDGE - height;
    left = Math.max(box.left + EDGE, left);
    top = Math.max(box.top + EDGE, top);
    const next = { left: Math.round(left - box.left), top: Math.round(top - box.top) };
    setPosition((current) =>
      current && current.left === next.left && current.top === next.top ? current : next,
    );
  };

  // Runs after every render so edits, expanded pickers and layout shifts keep it anchored.
  useLayoutEffect(place);

  useEffect(() => {
    frame.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    const observer = new ResizeObserver(place);
    observer.observe(frame);
    observer.observe(container);
    return () => {
      frame.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
      observer.disconnect();
    };
  }, [element, frame, container]);

  const colors = matches.filter((match): match is ColorMatch => match.kind === "color");
  const radius = matches.find((match) => match.kind === "radius");
  const spacing = matches.find((match) => match.kind === "spacing");
  const fonts = matches.filter((match): match is FontMatch => match.kind === "font");
  const type = matches.find((match) => match.kind === "type");
  const empty = !matches.some(
    (match) => match.kind !== "type" && !("inherited" in match && match.inherited),
  );

  return (
    <div
      ref={ref}
      className="token-popover"
      role="dialog"
      aria-label={`Tokens on ${description}`}
      tabIndex={-1}
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
        visibility: position ? "visible" : "hidden",
      }}
    >
      <header className="token-popover-head">
        <span className="token-popover-title">{description}</span>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close token popover">
          <X size={15} />
        </button>
      </header>
      {notice && (
        <p className="token-popover-notice" role="note">
          {notice === "variant-b"
            ? "Variant B is a preview of another direction; edit Variant A or the inspector."
            : "This is a shared link, so tokens are view-only."}
        </p>
      )}
      <div className="token-popover-body">
        {empty && <p className="token-popover-empty">This element uses no CHROMIQ tokens directly.</p>}
        {colors.length > 0 && (
          <section aria-label="Color">
            <h3>Color</h3>
            {colors.map((match) => {
              const id = `${match.property}-${match.role}`;
              const value = tokenColor(match.role, tokens, mode);
              const expandable = editable && match.token !== null && !match.inherited;
              const expanded = open === id;
              return (
                <div key={id} className="token-row-wrap">
                  <button
                    type="button"
                    className="token-row"
                    disabled={!expandable}
                    aria-expanded={expandable ? expanded : undefined}
                    onClick={() => setOpen(expanded ? null : id)}
                  >
                    <span className="token-swatch" style={{ background: value }} aria-hidden="true" />
                    <span className="token-row-text">
                      <span>
                        {roleLabels[match.role]}
                        {match.inherited && <em> inherited</em>}
                      </span>
                      <code>
                        {colorRoleVars[match.role]} · {propertyLabels[match.property]}
                      </code>
                    </span>
                    <code className="token-row-value">{value}</code>
                  </button>
                  {expanded && match.token && (
                    <div className="token-picker">
                      <ColorPicker
                        value={value}
                        label={`${roleLabels[match.role]} (${mode} theme)`}
                        onChange={(hex) =>
                          updateTokens({ [match.token as keyof Tokens]: hex }, { coalesce: true })
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
        {(radius || spacing) && (
          <section aria-label="Shape">
            <h3>Shape</h3>
            {radius && (
              <label className="token-slider">
                <span>
                  Radius <code>--chromiq-radius</code>
                </span>
                <input
                  type="range"
                  min={0}
                  max={28}
                  step={1}
                  value={tokens.radius}
                  disabled={!editable}
                  onChange={(event) =>
                    updateTokens({ radius: Number(event.target.value) }, { coalesce: true })
                  }
                />
                <output>{tokens.radius}px</output>
              </label>
            )}
            {spacing && (
              <label className="token-slider">
                <span>
                  Spacing <code>--chromiq-space</code>
                </span>
                <input
                  type="range"
                  min={4}
                  max={16}
                  step={1}
                  value={tokens.spacing}
                  disabled={!editable}
                  onChange={(event) =>
                    updateTokens({ spacing: Number(event.target.value) }, { coalesce: true })
                  }
                />
                <output>{tokens.spacing}px</output>
              </label>
            )}
          </section>
        )}
        {(fonts.length > 0 || type) && (
          <section aria-label="Type">
            <h3>Type</h3>
            {fonts.map((match) => {
              const options = fontCatalog.filter((font) => font.category === match.role);
              const current = tokens[match.token];
              return (
                <label key={match.token} className="token-field">
                  <span>
                    {match.role[0].toUpperCase() + match.role.slice(1)} font
                    {match.inherited && <em> inherited</em>} <code>{fontVars[match.role]}</code>
                  </span>
                  <select
                    value={current}
                    disabled={!editable || match.inherited}
                    onChange={(event) => {
                      loadFontFamily(event.target.value);
                      updateTokens({ [match.token]: event.target.value });
                    }}
                  >
                    {!options.some((font) => font.name === current) && (
                      <option value={current}>{current}</option>
                    )}
                    {options.map((font) => (
                      <option key={font.name} value={font.name}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
            {type?.kind === "type" && (
              <p className="token-type-readout">
                {Math.round(type.fontSizePx * 10) / 10}px
                {type.lineHeight !== null && ` · line ${Math.round(type.lineHeight * 100) / 100}`}
                {type.tracking !== null && ` · tracking ${Math.round(type.tracking * 1000) / 1000}em`}
              </p>
            )}
          </section>
        )}
      </div>
      <footer className="token-popover-foot">Matched from computed styles</footer>
    </div>
  );
}
