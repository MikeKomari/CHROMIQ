import { Suspense } from "react";
import type { Metadata } from "next";
import { LEGAL_CONTACT, LegalPage } from "@/components/legal/legal-page";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { siteName, socialImage } from "@/lib/site";

const description =
  "Report a site that will not load, a bug in the workbench, or an idea — without leaving CHROMIQ.";

export const metadata: Metadata = {
  title: "Feedback | CHROMIQ",
  description,
  alternates: { canonical: "/feedback" },
  openGraph: { type: "website", siteName, title: "Feedback | CHROMIQ", description, images: [socialImage] },
  twitter: { card: "summary_large_image", title: "Feedback | CHROMIQ", description, images: [socialImage.url] },
};

export default function FeedbackPage() {
  return (
    <LegalPage
      title="Feedback"
      intro="Some pages will not load in the preview, and some of those are CHROMIQ's fault rather than the site's. Telling us which is the fastest way to get them fixed."
      lastUpdated={null}
    >
      <section>
        <h2>What happens to a report</h2>
        <p>
          It is stored in CHROMIQ&apos;s own database and read by the person who
          maintains it. There is no ticketing service and no third party
          involved. A report is kept for as long as it is useful and no longer
          than six months, and you can have it deleted sooner by writing to{" "}
          <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.
        </p>
        <p>
          Your IP address is not stored with the report. If you leave an email
          address it is used to reply to you and nothing else; leave it blank
          and the report cannot be traced back to you at all.
        </p>
      </section>

      <section>
        {/* useSearchParams needs a boundary, or the whole route opts out of
            static rendering. */}
        <Suspense fallback={<p className="feedback-hint">Loading the form…</p>}>
          <FeedbackForm contactEmail={LEGAL_CONTACT} />
        </Suspense>
      </section>
    </LegalPage>
  );
}
