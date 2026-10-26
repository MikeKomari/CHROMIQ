import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Home, SearchX } from "lucide-react";
import "./system-pages.css";

export const metadata: Metadata = {
  title: "Page not found | CHROMIQ",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="error-screen">
      <div className="error-card" data-tone="neutral">
        <SearchX size={20} aria-hidden="true" />
        <span className="eyebrow">CHROMIQ / 404</span>
        <h1>That page is not here.</h1>
        <p>
          The address may be mistyped, or the page may have moved. Your projects
          are stored in this browser and are not affected.
        </p>
        <div className="error-actions">
          <Link href="/workspace" className="primary-button">
            Open the workspace <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <Link href="/" className="secondary-button">
            <Home size={15} aria-hidden="true" /> Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
