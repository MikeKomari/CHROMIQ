import Link from "next/link";
import { ArrowRight } from "lucide-react";

const items = [
  ["Colors and harmonies", "Randomize palettes with harmony modes so the result stays coherent."],
  ["Locks", "Pin the tokens you like and shuffle everything else."],
  ["Type pairing", "Pair display, body and mono from 12 Google fonts."],
  ["Shape and depth", "Radius, spacing and shadow, applied everywhere at once."],
  ["Compare A/B", "Hold two variants next to each other before choosing."],
  ["Six surfaces", "Preview the system on six different layouts."],
] as const;

export function Playground() {
  return (
    <section id="playground" className="ld-section ld-tint" aria-labelledby="pg-title">
      <div className="ld-wrap ld-grid">
        <header className="ld-section-head">
          <p className="ld-kicker">
            <span>04</span> Playground
          </p>
          <h2 id="pg-title" className="ld-h2">
            Start from nothing and explore.
          </h2>
          <Link href="/workspace" className="ld-btn ld-btn-solid ld-cta">
            <span>Open workspace</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>
        <ul className="ld-pg">
          {items.map(([t, d]) => (
            <li key={t}>
              <h3>{t}</h3>
              <p>{d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
