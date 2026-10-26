import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import "@/app/legal.css";

export const LAST_UPDATED = "2026-10-26";

/**
 * Where privacy and terms enquiries go.
 *
 * CHROMIQ is run by one person with no company behind it, so this is a
 * personal address rather than a role mailbox. That is fine legally — what the
 * GDPR and the CCPA ask for is a contact that actually reaches whoever decides
 * what happens to the data, which this does. Swap it for a role address on the
 * project's own domain if CHROMIQ ever gets one; both legal pages read it from
 * here, so this line is the only place that needs changing.
 */
export const LEGAL_CONTACT = "michealkgt@gmail.com";

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
