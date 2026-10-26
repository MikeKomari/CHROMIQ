"use client";

import Link from "next/link";
import { MotionConfig } from "motion/react";
import { ChromiqMark, ChromiqWordmark } from "@/components/brand/chromiq-logo";
import { ColorWashText } from "@/components/scroll/color-wash-text";
import { Parallax } from "@/components/scroll/parallax";
import { ScrollChapter } from "@/components/scroll/scroll-chapter";
import { ScrollChrome } from "@/components/scroll/scroll-chrome";
import { SmoothScroll } from "@/components/scroll/smooth-scroll";
import { DemoReel } from "./demo-reel";
import { HeroScroll } from "./hero-scroll";
import { LandingFooter } from "./landing-footer";

/**
 * The statement's colour sweep. This is the one place in the product where a
 * hue other than the violet appears, and the argument for it is that CHROMIQ
 * is a colour tool: the sentence explaining what it does demonstrates it. See
 * the "Landing surface" section of DESIGN.md.
 *
 * Every value clears 4.5:1 on --bg-deep, so the words stay readable at any
 * point in the sweep rather than only at the ends.
 */
const STATEMENT_SPECTRUM = [
  "#a585ff", // violet, the house accent
  "#6aa6ff", // blue
  "#4fd1c5", // teal
  "#7bdc92", // green
  "#f5c26b", // amber
  "#ff8fa8", // rose
];

const STATEMENT =
  "CHROMIQ is a browser-based design workbench. Tune a live token system, compare directions side by side, and leave with the CSS, Tailwind and shadcn/ui code your stack already uses.";

/**
 * Each chapter is one full viewport, in the order the page was planned:
 * the word, the reel, what CHROMIQ is, what it does, then the close.
 */
const CHAPTERS = [
  {
    id: "restyle",
    title: "Start from a real site",
    body: "Paste a public URL. CHROMIQ loads a scripts-off copy through its own proxy and lets you change type, colour, accent and radius on the live page, then hands you the override CSS.",
  },
  {
    id: "tokens",
    title: "Tune the system, not the pixels",
    body: "One token model drives every surface: colour roles with light and dark pairs, type pairing, scales, radius, spacing, border, shadow and motion. Change a token and six preview surfaces move together.",
  },
  {
    id: "contrast",
    title: "Know it passes before you ship it",
    body: "Every semantic pair is graded against WCAG as you work, failures are named rather than hidden, and a one-click fix nudges the smallest value that clears the bar. Colour-vision simulation is one toggle away.",
  },
  {
    id: "export",
    title: "Leave with code, not a screenshot",
    body: "Export CSS custom properties, Tailwind v4, shadcn/ui variables, W3C design tokens, a portable project file, or a written DESIGN.md. Failing tokens are flagged before anything downloads.",
  },
];

export function LandingScroll() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="landing landing-scroll">
        <SmoothScroll />
        <a className="ld-skip" href="#main">
          Skip to content
        </a>

        <ScrollChrome
          mark={
            <Link href="/" className="ld-sc-mark" aria-label="CHROMIQ, home">
              <ChromiqMark height={20} />
              <ChromiqWordmark height={24} label="" />
            </Link>
          }
          action={
            <Link href="/workspace" className="ld-sc-cta">
              Open the workbench
            </Link>
          }
          hint={<span>Scroll for more</span>}
          note={<span>made by MikeKomari</span>}
        />

        <main id="main">
          <HeroScroll />

          <ScrollChapter id="reel" align="center">
            <Parallax distance={90}>
              <DemoReel
                poster="/reel/chromiq-reel-poster.svg"
                sources={[
                  { src: "/reel/chromiq-reel.webm", type: "video/webm" },
                  { src: "/reel/chromiq-reel.mp4", type: "video/mp4" },
                ]}
                caption="A token change moving through the preview surfaces in CHROMIQ."
              />
            </Parallax>
          </ScrollChapter>

          <ScrollChapter id="what" align="center" labelledBy="what-title">
            <h2 className="ld-statement" id="what-title">
              <ColorWashText
                text={STATEMENT}
                palette={STATEMENT_SPECTRUM}
                spread={3}
              />
            </h2>
          </ScrollChapter>

          {CHAPTERS.map((chapter, i) => (
            <ScrollChapter
              key={chapter.id}
              id={chapter.id}
              index={i + 1}
              total={CHAPTERS.length}
              labelledBy={`${chapter.id}-title`}
              title={
                <h2 className="ld-ch-title" id={`${chapter.id}-title`}>
                  {chapter.title}
                </h2>
              }
            >
              <p className="ld-ch-body">{chapter.body}</p>
            </ScrollChapter>
          ))}

          <ScrollChapter id="start" align="center" labelledBy="start-title">
            <h2 className="ld-close-title" id="start-title">
              Open it and change one token.
            </h2>
            <p className="ld-close-body">
              No account needed. Your work stays in this browser until you decide
              otherwise.
            </p>
            <Link href="/workspace" className="ld-close-cta">
              Open the workbench
            </Link>
          </ScrollChapter>
        </main>

        <LandingFooter />
      </div>
    </MotionConfig>
  );
}
