import type { MetadataRoute } from "next";
import { brandNight } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CHROMIQ",
    short_name: "CHROMIQ",
    description:
      "A browser-first design workbench for exploring, comparing, and exporting frontend visual systems.",
    start_url: "/",
    display: "standalone",
    // The workbench opens in dark mode, so an installed window that paints its
    // chrome and splash white flashes before the app renders.
    theme_color: brandNight,
    background_color: brandNight,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
