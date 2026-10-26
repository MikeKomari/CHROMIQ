export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

export const siteName = "CHROMIQ";

/** Square brand mark used as the social preview image until a dedicated card exists. */
export const socialImage = { url: "/icon-512.png", width: 512, height: 512, alt: "CHROMIQ mark" };
