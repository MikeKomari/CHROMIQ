"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Momentum smoothing for the page scroll.
 *
 * Lenis still drives the real window scroll rather than transforming a
 * container, so `position: fixed` chrome, IntersectionObserver, anchor links
 * and `window.scrollY` all keep working exactly as they do without it.
 *
 * Under `prefers-reduced-motion` the instance is destroyed rather than never
 * created, so a viewer who changes the setting mid-visit gets native scrolling
 * back without a reload.
 */
export function SmoothScroll() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;
    let frame = 0;

    const start = () => {
      if (lenis) return;
      lenis = new Lenis({
        // Long enough to read as momentum, short enough that a flick still
        // lands where the viewer aimed.
        duration: 1.05,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        // Touch devices have their own momentum; doubling it feels broken.
        syncTouch: false,
        touchMultiplier: 1,
      });
      const tick = (time: number) => {
        lenis?.raf(time);
        frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
    };

    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lenis?.destroy();
      lenis = null;
    };

    const sync = () => (query.matches ? stop() : start());

    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      stop();
    };
  }, []);

  return null;
}
