"use client";

import { useId, useState } from "react";
import { Shuffle } from "lucide-react";
import { fontCatalog } from "@/data/workspace";
import { loadFontFamily } from "@/lib/fonts";

const displayFonts = fontCatalog.filter((f) => f.category !== "mono");

function randomAccent() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 62% 62%)`;
}

export function LiveDemo() {
  const uid = useId();
  const [size, setSize] = useState(30);
  const [font, setFont] = useState("Space Grotesk");
  const [accent, setAccent] = useState("");

  function pickFont(name: string) {
    loadFontFamily(name);
    setFont(name);
  }

  return (
    <figure className="ld-demo" aria-label="Live specimen you can tweak">
      <figcaption className="ld-demo-cap">
        <span>Try it</span>
        <span>This card is live</span>
      </figcaption>
      <div
        className="ld-specimen"
        style={accent ? ({ "--demo-accent": accent } as React.CSSProperties) : undefined}
      >
        <p className="ld-specimen-tag">Specimen / {font}</p>
        <p
          className="ld-specimen-text"
          style={{ fontFamily: `"${font}", sans-serif`, fontSize: `${size}px` }}
        >
          Type is the quietest part of a system, until it is wrong.
        </p>
        <p className="ld-specimen-chip">
          <span aria-hidden="true" />
          {size}px · accent
        </p>
      </div>
      <div className="ld-controls">
        <div className="ld-field">
          <label htmlFor={`${uid}-size`}>Size</label>
          <input
            id={`${uid}-size`}
            type="range"
            min={16}
            max={44}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          />
          <output htmlFor={`${uid}-size`}>{size}px</output>
        </div>
        <div className="ld-field">
          <label htmlFor={`${uid}-font`}>Font</label>
          <select
            id={`${uid}-font`}
            value={font}
            onChange={(e) => pickFont(e.target.value)}
          >
            {displayFonts.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="ld-btn ld-btn-ghost"
          onClick={() => setAccent(randomAccent())}
        >
          <Shuffle size={15} aria-hidden="true" />
          <span>Shuffle accent</span>
        </button>
      </div>
    </figure>
  );
}
