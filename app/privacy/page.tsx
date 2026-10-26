import type { Metadata } from "next";
import { LEGAL_CONTACT, LegalPage } from "@/components/legal/legal-page";
import { siteName, socialImage } from "@/lib/site";

const description =
  "What CHROMIQ stores in your browser, what its servers handle, and how to delete your data.";

export const metadata: Metadata = {
  title: "Privacy | CHROMIQ",
  description,
  alternates: { canonical: "/privacy" },
  openGraph: { type: "website", siteName, title: "Privacy | CHROMIQ", description, images: [socialImage] },
  twitter: { card: "summary", title: "Privacy | CHROMIQ", description, images: [socialImage.url] },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="CHROMIQ is a design workbench that runs mostly in your browser. This page explains what stays on your device, what reaches our servers, and what reaches other companies' servers."
    >
      {/* DRAFT: developer-written, not lawyer-reviewed. Every claim below was checked against the code on the date above. */}
      <section>
        <h2>What stays in your browser</h2>
        <p>
          By default, everything you make is saved in your browser&apos;s
          localStorage on your own device. Nothing is sent to us to do that.
        </p>
        <ul>
          <li>
            Your design tokens, projects, named snapshots, version history,
            locked tokens, and workspace settings (keys beginning{" "}
            <code>chromiq-</code>).
          </li>
          <li>
            Interface preferences: Comfort or High contrast, interface text
            size, panel layout, and which inspector sections are open.
          </li>
        </ul>
        <p>
          Apart from signing in to an account (below), CHROMIQ does not set
          cookies. If your browser blocks
          localStorage, the workspace still runs but will not remember anything
          between sessions.
        </p>
      </section>

      <section>
        <h2>Share links</h2>
        <p>
          Creating a share link <strong>stores a copy of that token system on
          our servers</strong>, in our Postgres database, under a short random
          code (the <code>?s=</code> part of the address). This is the normal
          path, and it happens whether or not you have an account.
        </p>
        <ul>
          <li>
            We store the shared token system itself, the random code, the time
            it was created, and a count of how many times the link has been
            opened. We do not record who opened it.
          </li>
          <li>
            If you were signed in when you created it, the share is also linked
            to your account, so that you can delete it later.
          </li>
          <li>
            Share links expire automatically one year after they are created,
            and the stored copy is deleted at that point.
          </li>
          <li>
            Anyone with the link can read it. There is no password on it and it
            is not listed anywhere, but it is not secret either.
          </li>
          <li>
            If short links are unavailable, CHROMIQ falls back to putting the
            whole system inside the address itself (the <code>?share=</code>
            form). Nothing is stored on our servers in that case.
          </li>
        </ul>
        <p>
          Either way, the address will appear in the request logs of whoever
          hosts CHROMIQ when the link is opened.
        </p>
      </section>

      <section>
        <h2>Accounts and cloud sync (optional)</h2>
        <p>
          You can use CHROMIQ without an account. If you want your projects on
          more than one device, you can create an account with an email address
          and a password. Only people who choose this send us anything.
        </p>
        <ul>
          <li>
            We store your email address, a hashed version of your password (never
            the password itself), and the projects you choose to sync.
          </li>
          <li>
            Signing in creates a session, which is recorded in our Postgres
            database and tied to your browser so you stay signed in. Against
            that session we store your browser&apos;s user agent string (the
            name and version it reports), so that a session can be recognised.
          </li>
          <li>
            The session cookie lasts 30 days and is extended while you keep
            using CHROMIQ. It is marked <code>HttpOnly</code> and
            <code>SameSite=Lax</code>, and is sent only over HTTPS in
            production. Signing out deletes the session from our database.
          </li>
          <li>
            There is no social login, no password-reset email yet, and we do not
            send marketing email.
          </li>
        </ul>
      </section>

      <section>
        <h2>The URL inspector and website preview</h2>
        <p>
          Two features fetch a web page for you. When you paste a public address
          into the inspector or the Restyle view, your browser sends that address
          to <code>/api/inspect</code> or <code>/api/proxy</code>. Our server
          then requests the page itself, over the public internet, and sends
          back the result.
        </p>
        <ul>
          <li>
            The inspector reads the page&apos;s HTML and linked stylesheets, and
            returns the title, headings, and colors it found.
          </li>
          <li>
            The preview returns a copy of the page with scripts removed, so it
            renders as a static page. It is limited to about 2 MB and 10 seconds.
          </li>
          <li>
            Only public web addresses work. Requests to private or internal
            network addresses are refused.
          </li>
          <li>
            The address you enter and the page we fetch are not saved by the
            application. They exist in memory while the request runs.
          </li>
          <li>
            The site you ask us to fetch sees a request from our server (not
            your IP address), with a user agent that names CHROMIQ.
          </li>
          <li>
            In the preview, images, stylesheets, and fonts still load from the
            original site <em>in your browser</em>, so that site&apos;s servers
            can see your IP address.
          </li>
        </ul>
      </section>

      <section>
        <h2>What our servers log</h2>
        <p>
          The application code does not write its own logs of what you fetch. To
          keep the fetch features from being abused, it keeps a short-lived
          counter per IP address in server memory (20 previews and 30
          inspections per minute). That counter is not written to a database and
          is lost when the server instance restarts.
        </p>
        <p>
          CHROMIQ is hosted on Vercel. Like any host, it keeps standard request
          logs that can include your IP address, the time, the path and query
          string requested (which is where an inspected address appears), and
          the response status. Retention is set by the host, not by us.
        </p>
      </section>

      <section>
        <h2>Analytics and trackers</h2>
        <p>
          CHROMIQ currently uses no analytics, advertising, or tracking
          services, and the app itself loads no third-party scripts. If that changes, this page
          will be updated first.
        </p>
      </section>

      <section>
        <h2>Google Fonts</h2>
        <p>
          The interface fonts (Space Grotesk, Inter, IBM Plex Mono) and any
          fonts you pick in the type panel load from Google&apos;s servers
          (<code>fonts.googleapis.com</code> and <code>fonts.gstatic.com</code>).
          Google receives your IP address and browser details when that happens,
          under Google&apos;s own privacy policy. The bookmarklet does the same
          on the page where you run it.
        </p>
      </section>

      <section>
        <h2>Deleting your data</h2>
        <ul>
          <li>
            <strong>Local data:</strong> clear this site&apos;s data in your
            browser settings, or remove the <code>chromiq-</code> entries from
            localStorage. We cannot see or delete them for you.
          </li>
          <li>
            <strong>Account data:</strong> open the account dialog in the
            workspace and choose Delete account. This immediately and
            permanently removes your email address, your password hash, every
            session, every project you have synced, and every share link you
            created while signed in. You can also email us at {LEGAL_CONTACT}
            from the address on the account and ask us to do it for you.
          </li>
          <li>
            <strong>Share links you created while signed in:</strong> these can
            be deleted, which stops the link resolving for everyone.
          </li>
          <li>
            <strong>Share links created without an account:</strong> these carry
            no owner, so we have no way to tell your request apart from anyone
            else holding the link, and we cannot revoke them on request. They
            are deleted automatically one year after they were created. The same
            applies to the <code>?share=</code> fallback form, where the data
            lives in the link itself and was never stored by us.
          </li>
        </ul>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          When this page changes, the date at the top changes with it. Questions
          about privacy: {LEGAL_CONTACT}.
        </p>
      </section>
    </LegalPage>
  );
}
