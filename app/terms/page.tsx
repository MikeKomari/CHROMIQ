import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT, LegalPage } from "@/components/legal/legal-page";
import { siteName, socialImage } from "@/lib/site";

const description =
  "The rules for using CHROMIQ, including acceptable use of the URL inspector and website preview.";

export const metadata: Metadata = {
  title: "Terms | CHROMIQ",
  description,
  alternates: { canonical: "/terms" },
  openGraph: { type: "website", siteName, title: "Terms | CHROMIQ", description, images: [socialImage] },
  twitter: { card: "summary", title: "Terms | CHROMIQ", description, images: [socialImage.url] },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      intro="These terms cover the hosted CHROMIQ site. By using it you agree to them. If you do not, please do not use it."
    >
      {/* DRAFT: developer-written, not lawyer-reviewed. */}
      <section>
        <h2>What CHROMIQ is</h2>
        <p>
          CHROMIQ is a browser-based workbench for tuning a design token system,
          comparing variants, and exporting CSS, Tailwind, shadcn/ui, and
          DESIGN.md output. It also includes a URL inspector and a website
          preview that fetch public pages on your behalf. See the{" "}
          <Link href="/privacy">Privacy</Link> page for how data is handled. The
          source code is licensed separately under the MIT License in the
          project repository; these terms apply to the hosted service.
        </p>
      </section>

      <section>
        <h2>Your work</h2>
        <p>
          What you create in CHROMIQ is yours. We claim no ownership of your
          tokens, projects, or exports. If you use an account to sync projects,
          you give us permission to store them and show them back to you, and
          nothing more.
        </p>
        <p>
          You are responsible for keeping your own copy. Projects live in your
          browser by default and can be lost if you clear site data. Export what
          you cannot afford to lose.
        </p>
      </section>

      <section>
        <h2>Accounts</h2>
        <p>
          Accounts are optional. Keep your password private, and tell us if you
          think someone else has access. You are responsible for activity under
          your account. We may suspend accounts that break these terms.
        </p>
      </section>

      <section>
        <h2>The URL inspector and website preview</h2>
        <p>
          When you enter a public address, our server fetches that page,
          server-side, and returns either a summary of its colors, headings, and
          styles (the inspector) or a copy with scripts removed (the preview).
          The copy is shown to you for restyling and is not published, stored,
          or shared by us. The content still belongs to its owner.
        </p>
        <h3>Acceptable use</h3>
        <p>You agree not to:</p>
        <ul>
          <li>
            fetch content you have no right to access, or use the preview to
            copy, republish, or redistribute someone else&apos;s page;
          </li>
          <li>
            circumvent paywalls, logins, rate limits, or any other access
            control, or try to reach private or internal network addresses;
          </li>
          <li>
            use the inspector or preview in an automated or bulk way, such as
            scripts, crawlers, or scrapers, or in a way meant to put load on a
            third-party site;
          </li>
          <li>
            use CHROMIQ to attack, probe, or overload any site or this service,
            or to get around the limits we apply to requests;
          </li>
          <li>
            use it to break the law or the rights of others, including
            copyright and privacy rights.
          </li>
        </ul>
        <p>
          We limit request size, duration, and frequency, and we may block
          addresses or accounts that look like abuse, without notice.
        </p>
      </section>

      <section>
        <h2>Abuse and copyright reports</h2>
        <p>
          If you own a site or content that is being fetched through CHROMIQ in
          a way you object to, or you believe the service is being misused,
          email {LEGAL_CONTACT}. Include the address involved, what you want
          done, and how to reach you. For copyright (DMCA) notices, include
          identification of the work, the location of the material, a statement
          of good-faith belief, and your signature, and we will review and act
          on it.
        </p>
        {/* The contact address is LEGAL_CONTACT, tracked in components/legal/legal-page.tsx.
            Registering a DMCA designated agent with the US Copyright Office is optional
            and deliberately not claimed here: saying we have one when we do not would be
            worse than staying silent. Revisit if the proxy ever draws a real complaint. */}
      </section>

      <section>
        <h2>No warranty</h2>
        <p>
          CHROMIQ is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;,
          without warranties of any kind, express or implied, including fitness
          for a particular purpose and non-infringement. The inspector and
          preview produce reconstructions that can be incomplete or inaccurate,
          and generated contrast checks and exports are aids, not guarantees of
          accessibility or legal compliance. The service may change, be
          interrupted, or be withdrawn at any time.
        </p>
      </section>

      <section>
        <h2>Limit of liability</h2>
        <p>
          To the extent the law allows, we are not liable for lost data, lost
          profits, or any indirect or consequential damages arising from your use
          of CHROMIQ. Nothing here limits liability that cannot be limited by law.
        </p>
        {/* Governing law and jurisdiction are deliberately omitted rather than guessed.
            The honest default is the operator's own country of residence, which is a
            decision for whoever runs this deployment, not something to infer here. */}
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these terms. The date at the top shows the latest
          version, and continued use after a change means you accept it.
          Contact: {LEGAL_CONTACT}.
        </p>
      </section>
    </LegalPage>
  );
}
