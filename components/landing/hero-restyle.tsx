"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { LiveDemo } from "./live-demo";

function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    ? value
    : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function HeroRestyle() {
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
    <section className="ld-hero" aria-labelledby="hero-title">
      <div className="ld-wrap ld-grid">
        <motion.div
          className="ld-hero-copy"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="ld-kicker">
            <span>00</span> Preview · Refine · Inspect · Style &amp; Manage
          </p>
          <h1 id="hero-title" className="ld-display">
            Restyle any website. Then ship the system.
          </h1>
          <p className="ld-lede">
            Paste a public link. PRISM loads the page in a sandboxed preview and
            you change its type, spacing and color live, or apply your own
            tokens. Keep what works and export it as code.
          </p>
          <form className="ld-url" onSubmit={submit} noValidate>
            <label htmlFor="ld-url-input" className="ld-label">
              Website address
            </label>
            <div className="ld-url-row">
              <input
                id="ld-url-input"
                type="text"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                placeholder="https://example.com"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError("");
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "ld-url-error" : undefined}
              />
              <button type="submit" className="ld-btn ld-btn-accent">
                <span>Restyle it</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
            <p id="ld-url-error" className="ld-error" role="alert">
              {error}
            </p>
          </form>
          <p className="ld-alt">
            or <Link href="/workspace">start from a blank system</Link>
          </p>
        </motion.div>
        <motion.div
          className="ld-hero-demo"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        >
          <LiveDemo />
        </motion.div>
      </div>
    </section>
  );
}
