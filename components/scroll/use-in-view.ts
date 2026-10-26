"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reports whether an element has scrolled into view.
 *
 * Reveal-on-scroll is decoration: when the viewer prefers reduced motion, or
 * when IntersectionObserver is unavailable, this reports `true` immediately so
 * the content is never trapped behind an animation that will not run.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(options?: {
  /** Fraction of the element that must be visible. */
  amount?: number;
  /** Keep reporting true once seen, so content does not fade back out. */
  once?: boolean;
}) {
  const { amount = 0.25, once = true } = options ?? {};
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  // False until the effect has run on the client. Callers use this to leave
  // content visible in the server-rendered HTML, so a viewer without
  // JavaScript sees the page rather than a stack of empty sections.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    setReady(true);

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold: amount },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [amount, once]);

  return { ref, inView, ready };
}

/** Scroll progress through the document, 0 to 1. */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const scrollable = document.body.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
    };
    const onScroll = () => {
      // Coalesce to one read per frame; scroll fires far more often than paint.
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
  }, []);

  return progress;
}
