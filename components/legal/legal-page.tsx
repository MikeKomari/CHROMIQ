import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import "@/app/legal.css";

export const LAST_UPDATED = "2026-10-23";

// TODO(launch): replace with the real address once the domain mailbox exists. Not a working address yet.
export const LEGAL_CONTACT = "legal@[domain to be added]";

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="legal">
      <header className="legal-bar">
        <div className="legal-wrap legal-bar-inner">
          <Link href="/" className="legal-wordmark" aria-label="CHROMIQ home">
            CHROMIQ
          </Link>
          <nav aria-label="Legal" className="legal-nav">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </header>
      <main className="legal-wrap legal-main" id="main">
        <Link href="/" className="legal-back">
          <ArrowLeft size={14} aria-hidden="true" /> Back to home
        </Link>
        <h1>{title}</h1>
        <p className="legal-meta">
          Last updated <time dateTime={LAST_UPDATED}>{LAST_UPDATED}</time>
        </p>
        <p className="legal-intro">{intro}</p>
        <article className="legal-body">{children}</article>
      </main>
    </div>
  );
}
