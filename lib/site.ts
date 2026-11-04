export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

export const siteName = "CHROMIQ";

/**
 * The dedicated Open Graph card, 1200x630 -- the size both Open Graph and
 * Twitter's `summary_large_image` read at.
 *
 * This used to be the square app icon, which every crawler centre-cropped into
 * a small square tile beside the link. The card is generated from
 * `brand/web/social-card.html` by `node brand/web/render-social-card.mjs`;
 * re-render it after any brand change rather than editing the PNG.
 */
export const socialImage = {
  url: "/social-card.png",
  width: 1200,
  height: 630,
  alt: "CHROMIQ: visual systems, made tangible",
};

/** Night, from brand/GUIDELINES.md. The workbench opens in dark mode. */
export const brandNight = "#0F0D14";
