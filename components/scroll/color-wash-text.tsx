"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * Text whose words take on colour one after another, left to right, as the
 * block rises through the viewport. The sweep is finished by the time the
 * block is centred, so the reader sees the completed sentence sitting still
 * rather than catching the last word on its way off the screen.
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
    // Geometry is measured outside the scroll handler so a frame costs one
    // style write and no layout. Reading getBoundingClientRect() per frame
    // forces a synchronous layout on every scroll event, which is the kind of
    // thing that makes a smooth-scrolled page feel gritty.
    let docTop = 0;
    let height = 0;
    let viewport = 0;

    const measure = () => {
      const box = node.getBoundingClientRect();
      docTop = box.top + window.scrollY;
      height = box.height;
      viewport = window.innerHeight;
    };

    /**
     * Where the sweep begins and ends, as the block's own position.
     *
     * It starts as the block comes in, with its top a tenth of the way above
     * the bottom edge, and finishes when the block is vertically centred. That
     * end point is the fix for the sweep appearing not to stop anywhere in
     * particular: it used to finish when the block's bottom passed the top of
     * the viewport, so the final word took its colour after the sentence had
     * already left the screen, and the reader never saw the finished line. The
     * sweep now completes with the whole sentence sitting in the middle of the
     * viewport, and the rest of the scroll is spent reading it.
     *
     * Centring is also what `Parallax` treats as the neutral position, so the
     * two effects agree about when an element has "arrived".
     */
    const progressAt = (scrollY: number) => {
      const top = docTop - scrollY;
      const from = viewport * 0.9;
      const to = (viewport - height) / 2;
      const span = from - to;
      if (span <= 0) return 1;
      return (from - top) / span;
    };

    // Smoothstep. The sweep eases in and settles out instead of starting and
    // stopping abruptly at the ends of the range, which is most of what makes
    // it feel attached to the scroll rather than driven by it.
    const ease = (t: number) => t * t * (3 - 2 * t);

    const read = () => {
      frame = 0;
      const raw = Math.min(1, Math.max(0, progressAt(window.scrollY)));
      node.style.setProperty("--sc-wash-p", String(ease(raw)));
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(read);
    };

    const onResize = () => {
      measure();
      onScroll();
    };

    measure();
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    // The block's height changes when a webfont swaps in or the text rewraps,
    // and a stale height silently shifts where the sweep ends.
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(onResize) : null;
    observer?.observe(node);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
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
