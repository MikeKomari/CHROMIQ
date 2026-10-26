"use client";

import Link from "next/link";
import { ArrowUpRight, Contrast } from "lucide-react";
import { useContrast } from "@/hooks/use-contrast";
import { ChromiqMark, ChromiqWordmark } from "@/components/brand/chromiq-logo";

export function LandingNav() {
  const [contrast, setContrast] = useContrast();
  const high = contrast === "high";
  return (
    <header className="ld-nav">
      <div className="ld-wrap ld-nav-inner">
        <Link href="/" className="ld-wordmark" aria-label="CHROMIQ home">
          <ChromiqMark height={26} />
          <ChromiqWordmark height={30} label="" />
        </Link>
        <nav aria-label="Sections" className="ld-nav-links">
          <a href="#restyle">Restyle</a>
          <a href="#playground">Playground</a>
          <a href="#export">Export</a>
        </nav>
        <div className="ld-nav-actions">
          <button
            type="button"
            className="ld-btn ld-btn-ghost"
            aria-pressed={high}
            onClick={() => setContrast(high ? "comfort" : "high")}
          >
            <Contrast size={15} aria-hidden="true" />
            <span>{high ? "High contrast" : "Comfort"}</span>
          </button>
          <Link href="/workspace" className="ld-btn ld-btn-solid">
            <span>Open workspace</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
