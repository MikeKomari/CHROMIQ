import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const routes = ["/", "/workspace", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({ url: new URL(route, siteUrl).toString() }));
}
