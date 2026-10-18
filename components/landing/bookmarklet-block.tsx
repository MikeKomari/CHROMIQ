"use client";

import { useEffect, useRef, useState } from "react";
import { bookmarkletHref } from "@/lib/bookmarklet";

export function BookmarkletBlock() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [hint, setHint] = useState("");

  useEffect(() => {
    ref.current?.setAttribute("href", bookmarkletHref(window.location.origin));
  }, []);

  return (
    <section className="ld-section" aria-labelledby="bm-title">
      <div className="ld-wrap ld-grid">
        <header className="ld-section-head">
          <p className="ld-kicker">
            <span>03</span> PRISM on any site
          </p>
          <h2 id="bm-title" className="ld-h2">
            Or restyle the site you are already on.
          </h2>
        </header>
        <div className="ld-bm">
          <p>
            Save this bookmarklet once. On any website, click it to open a
            floating restyle panel over the live page.
          </p>
          <p>
            Some sites block bookmarklets with strict security policies. On
            those, use paste-a-link in PRISM instead.
          </p>
          <a
            ref={ref}
            className="ld-bookmarklet"
            draggable="true"
            onClick={(e) => {
              e.preventDefault();
              setHint("Drag it to your bookmarks bar");
            }}
          >
            PRISM ↗ Restyle
          </a>
          <p className="ld-hint" role="status">
            {hint}
          </p>
          <ol className="ld-bm-steps">
            <li>
              Show your bookmarks bar: <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> or{" "}
              <kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>.
            </li>
            <li>Drag the button above onto the bar. Do not click it here.</li>
            <li>Open any site and click the bookmark.</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
