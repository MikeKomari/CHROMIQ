"use client";

import { MotionConfig } from "motion/react";
import { BookmarkletBlock } from "./bookmarklet-block";
import { ExportStrip } from "./export-strip";
import { HeroRestyle } from "./hero-restyle";
import { Letters } from "./letters";
import { LandingFooter } from "./landing-footer";
import { LandingNav } from "./landing-nav";
import { Playground } from "./playground";
import { RestyleSteps } from "./restyle-steps";

export function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="landing">
        <a className="ld-skip" href="#main">
          Skip to content
        </a>
        <LandingNav />
        <main id="main">
          <HeroRestyle />
          <Letters />
          <RestyleSteps />
          <BookmarkletBlock />
          <Playground />
          <ExportStrip />
        </main>
        <LandingFooter />
      </div>
    </MotionConfig>
  );
}
