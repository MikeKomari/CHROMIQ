/**
 * Renders brand/web/social-card.html to public/social-card.png (CHROMIQ-1003).
 *
 * Run from the repository root after any brand change:
 *
 *   node brand/web/render-social-card.mjs
 *
 * Playwright is not a dependency of the app: the card is a build-time brand
 * asset, rendered rarely and committed, so shipping a browser download with
 * every `npm install` would be a poor trade. Install it only when you need to
 * re-render:
 *
 *   npx playwright@1.49.1 install chromium
 *   node brand/web/render-social-card.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, "social-card.html");
const out = resolve(here, "../../public/social-card.png");

const WIDTH = 1200;
const HEIGHT = 630;

const browser = await chromium.launch({ args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    // The card is published at its native size, so render 1:1 rather than at
    // 2x: a 2400x1260 file is heavier than the social crawlers will use.
    deviceScaleFactor: 1,
  });
  await page.goto(`file://${source}`);
  // The wordmark is outlined artwork, but the tagline and the domain line are
  // webfonts. Without this the card can render in a fallback face.
  await page.evaluate(() => document.fonts.ready);
  await mkdir(dirname(out), { recursive: true });
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  console.log(`wrote ${out} (${WIDTH}x${HEIGHT})`);
} finally {
  await browser.close();
}
