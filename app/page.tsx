import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: "PRISM: restyle any website, then ship the system",
  description:
    "Paste a public URL, tune its type and color live, and export override CSS, Tailwind v4, shadcn/ui, JSON tokens or DESIGN.md.",
};

export default function Home() {
  return <Landing />;
}
