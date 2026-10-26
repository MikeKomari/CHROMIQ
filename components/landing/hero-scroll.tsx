"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Parallax } from "@/components/scroll/parallax";

/** Accepts bare hostnames, so "stripe.com" works without a scheme. */
function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function HeroScroll() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const url = normalizeUrl(value);
    if (!url) {
      setError("Enter a public web address, like example.com or https://example.com/blog.");
      return;
    }
    setError("");
    router.push(`/workspace?restyle=${encodeURIComponent(url)}`);
  }

  return (
    <section className="ld-hero-scroll" aria-labelledby="hero-title">
      <div className="ld-hero-stack">
        <h1 className="ld-hero-word" id="hero-title">
          {/* Negative distance, so the word trails the scroll and lingers a
              beat while the page moves on under it. */}
          <Parallax as="span" distance={-90} className="ld-hero-word-layer">
            <span className="ld-hero-word-text">CHROMIQ</span>
          </Parallax>
          <span className="ld-hero-sr">
            CHROMIQ, a visual design workbench for frontend developers
          </span>
        </h1>

        <form className="ld-hero-form" onSubmit={submit} noValidate>
          <label className="ld-hero-label" htmlFor="hero-url">
            Paste any public site and restyle it live
          </label>
          <div className="ld-hero-field">
            <input
              id="hero-url"
              className="ld-hero-input"
              type="url"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              placeholder="stripe.com"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (error) setError("");
              }}
              aria-describedby={error ? "hero-url-error" : undefined}
              aria-invalid={error ? true : undefined}
            />
            <button className="ld-hero-go" type="submit">
              Restyle it <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          {error && (
            <p className="ld-hero-error" id="hero-url-error" role="alert">
              {error}
            </p>
          )}
          <p className="ld-hero-alt">
            or{" "}
            <Link href="/workspace" className="ld-hero-alt-link">
              open the workbench
            </Link>{" "}
            and start from a token system
          </p>
        </form>
      </div>
    </section>
  );
}
