"use client";

import type { CSSProperties, ReactNode } from "react";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * Moves its children against the scroll as they cross the viewport.
 *
 * `distance` is the total travel in pixels across the whole crossing: the
 * element sits `+distance / 2` below its layout position when it enters from
 * the bottom and `-distance / 2` above it when it leaves at the top, so it is
 * exactly where the layout put it when centred. A negative distance leads the
 * scroll instead of trailing it.
 *
 * Decoration only. Under `prefers-reduced-motion` the transform is dropped and
 * the children render in their layout position, so nothing is ever moved out
 * of reach of a viewer who asked for stillness.
 */
export function Parallax({
  children,
  distance = 60,
  className,
  style,
  as = "div",
}: {
  children: ReactNode;
  distance?: number;
  className?: string;
  style?: CSSProperties;
  /** Rendered element, for when a div would be invalid in the parent. */
  as?: "div" | "span";
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const travel = reduced ? 0 : distance / 2;
  const y = useTransform(scrollYProgress, [0, 1], [travel, -travel]);
  const shared = {
    className,
    style: { ...style, y, willChange: reduced ? undefined : "transform" },
  };

  return as === "span" ? (
    <motion.span ref={ref as React.Ref<HTMLSpanElement>} {...shared}>
      {children}
    </motion.span>
  ) : (
    <motion.div ref={ref as React.Ref<HTMLDivElement>} {...shared}>
      {children}
    </motion.div>
  );
}
