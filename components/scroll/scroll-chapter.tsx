"use client";

import type { ReactNode } from "react";
import { useInView } from "./use-in-view";

/**
 * One full-viewport scroll chapter.
 *
 * Deliberately knows nothing about the product using it: content comes in as
 * children, and theming happens through CSS custom properties on an ancestor,
 * so this directory can move to its own package unchanged.
 */
export function ScrollChapter({
  id,
  index,
  total,
  title,
  children,
  align = "left",
  labelledBy,
}: {
  id?: string;
  /** 1-based position, rendered as the chapter's index mark. */
  index?: number;
  total?: number;
  title?: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
  labelledBy?: string;
}) {
  const { ref, inView, ready } = useInView<HTMLElement>({ amount: 0.2 });

  return (
    <section
      id={id}
      ref={ref}
      className="sc-chapter"
      data-align={align}
      // Omitted until the client is ready, so the no-JS render stays visible.
      data-in-view={ready ? (inView ? "true" : "false") : undefined}
      aria-labelledby={labelledBy}
    >
      <div className="sc-chapter-inner">
        {index !== undefined && (
          <p className="sc-index" aria-hidden="true">
            <span>{String(index).padStart(2, "0")}</span>
            {total !== undefined && (
              <>
                <span className="sc-index-rule" />
                <span>{String(total).padStart(2, "0")}</span>
              </>
            )}
          </p>
        )}
        {title}
        {children}
      </div>
    </section>
  );
}
