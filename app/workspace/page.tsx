import type { Metadata } from "next";
import { Workspace } from "@/components/workspace";

export const metadata: Metadata = {
  title: "Workspace | CHROMIQ",
  description:
    "Tune type, color, and shape tokens live, compare variants, and export CSS, Tailwind, shadcn/ui, or DESIGN.md.",
  alternates: { canonical: "/workspace" },
};

export default function WorkspacePage() {
  return <Workspace />;
}
