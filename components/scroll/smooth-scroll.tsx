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
        // Framerate-independent smoothing rather than a fixed duration. A
        // duration makes every gesture take the same time to settle, so a
        // small nudge glides on far longer than the input suggested and the
        // page feels like it is deciding where to stop on its own. A lerp
        // tracks the wheel closely and settles in proportion to how far it
        // still has to go.
        //
        // Was 0.12, which settled a 600px flick in about 850ms. That is
        // genuinely eased -- measured, not assumed -- but close enough to
        // native that people reported the page as not feeling smooth at all.
        // 0.08 takes about 1.3s for the same flick: clearly a glide, still
        // short enough that the page stops roughly where the gesture asked.
        // Lower it further for more float; much below 0.06 starts to feel
        // like the page is deciding where to stop on its own.
        lerp: 0.08,
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
