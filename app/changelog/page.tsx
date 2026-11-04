import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { parseChangelog, type Span } from "@/lib/changelog";
import { siteName, socialImage } from "@/lib/site";

const description = "What has changed in CHROMIQ, release by release.";

export const metadata: Metadata = {
  title: "Changelog | CHROMIQ",
  description,
  alternates: { canonical: "/changelog" },
  openGraph: { type: "website", siteName, title: "Changelog | CHROMIQ", description, images: [socialImage] },
  twitter: { card: "summary_large_image", title: "Changelog | CHROMIQ", description, images: [socialImage.url] },
};

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((span, index) => {
        if (span.kind === "code") return <code key={index}>{span.text}</code>;
        if (span.kind === "link")
          return (
            <a key={index} href={span.href} target="_blank" rel="noopener noreferrer">
              {span.text}
            </a>
          );
        return <span key={index}>{span.text}</span>;
      })}
    </>
  );
}

/**
 * The public changelog (CHROMIQ-1007).
 *
 * Rendered from CHANGELOG.md rather than written twice, so "updated on
 * release" is a property of the repository rather than a thing to remember.
 * The file is read at build time; there is no request-time file access here.
 */
export default async function ChangelogPage() {
  const source = await readFile(join(process.cwd(), "CHANGELOG.md"), "utf8");
  const changelog = parseChangelog(source);

  return (
    <LegalPage
      title={changelog.title}
      intro="Every notable change to CHROMIQ, newest first. This page is generated from CHANGELOG.md in the repository, so it cannot drift from what was actually shipped."
      lastUpdated={null}
    >
      {changelog.intro.length > 0 && (
        <section>
          {changelog.intro.map((paragraph, index) => (
            <p key={index}>
              <Spans spans={paragraph} />
            </p>
          ))}
        </section>
      )}

      {changelog.entries.map((entry) => (
        <section key={`${entry.version}-${entry.date ?? ""}`}>
          <h2>
            {entry.version}
            {entry.date && (
              <>
                {" "}
                <time className="changelog-date" dateTime={entry.date}>
                  {entry.date}
                </time>
              </>
            )}
          </h2>
          {entry.intro.map((paragraph, index) => (
            <p key={index}>
              <Spans spans={paragraph} />
            </p>
          ))}
          {entry.groups.map((group) => (
            <div key={group.heading} className="changelog-group">
              <h3>{group.heading}</h3>
              <ul>
                {group.items.map((item, index) => (
                  <li key={index}>
                    <Spans spans={item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </LegalPage>
  );
}
