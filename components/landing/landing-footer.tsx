import Link from "next/link";
import { ChromiqWordmark } from "@/components/brand/chromiq-logo";

export function LandingFooter() {
  return (
    <footer className="ld-footer">
      <div className="ld-wrap ld-footer-inner">
        <ChromiqWordmark height={24} className="ld-wordmark" />
        <nav className="ld-footer-links" aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <span>
          made by{" "}
          <a href="https://michaelkimeison.com" target="_blank" rel="noopener noreferrer">
            MikeKomari
          </a>
        </span>
      </div>
    </footer>
  );
}
