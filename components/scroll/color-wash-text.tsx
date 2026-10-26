"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * Text whose words take on colour one after another, left to right, as the
 * block is scrolled through. By the time the block has finished crossing the
 * viewport every word is fully coloured.
 *
 * How the sweep works: the component writes a single `--sc-wash-p` (0 to 1) on
 * the container once per frame. Each word carries its own index and target
 * colour, and `app/scroll.css` turns those three values into that word's own
 * progress, so one style write per frame colours the whole paragraph instead
 * of one write per word. `--sc-wash-spread` controls how many words are
 * mid-transition at any moment: 1 is a hard edge marching along the line,
 * larger values a softer gradient.
 *
 * Product-agnostic: the palette comes in as a prop and the uncoloured state is
 * whatever `--sc-wash-from` resolves to on an ancestor.
 */
export function ColorWashText({
  text,
  palette,
  className,
  spread = 4,
  id,
}: {
  text: string;
  /** Target colours, assigned across the words in order and repeated as needed. */
  palette: string[];
  className?: string;
  spread?: number;
  id?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  // Split on whitespace but keep it: a word plus its following space is one
  // span, so the line wraps exactly as the unsplit text would.
  const words = useMemo(() => text.split(/(\s+)/).filter(Boolean), [text]);
  const wordCount = useMemo(
    () => words.filter((part) => !/^\s+$/.test(part)).length,
    [words],
  );

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Stillness was asked for: show the finished state rather than animating
    // to it, so the sentence is never half-grey.
    if (reduced) {
      node.style.setProperty("--sc-wash-p", "1");
      return;
    }

    let frame = 0;
    const read = () => {
      frame = 0;
      const box = node.getBoundingClientRect();
      const viewport = window.innerHeight;
      // 0 when the block's top reaches the bottom of the viewport, 1 once its
      // bottom has risen to a fifth of the way up. Finishing before the block
      // leaves means the last word is coloured while it is still being read.
      const span = viewport * 0.8 + box.height;
      const travelled = viewport - box.top - viewport * 0.2;
      const progress = span > 0 ? travelled / span : 1;
      node.style.setProperty(
        "--sc-wash-p",
        String(Math.min(1, Math.max(0, progress))),
      );
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [text]);

  let index = -1;
  return (
    <span
      ref={ref}
      id={id}
      className={`sc-wash ${className ?? ""}`.trim()}
      style={{ "--sc-wash-n": wordCount, "--sc-wash-spread": spread } as React.CSSProperties}
    >
      {words.map((part, i) => {
        if (/^\s+$/.test(part)) return part;
        index += 1;
        return (
          <span
            key={i}
            className="sc-wash-word"
            style={
              {
                "--sc-wash-i": index,
                "--sc-wash-to": palette[index % palette.length],
              } as React.CSSProperties
            }
          >
            {part}
          </span>
        );
      })}
    </span>
  );
}
