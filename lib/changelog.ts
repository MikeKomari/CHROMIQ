/**
 * Turns CHANGELOG.md into something the /changelog page can render.
 *
 * A markdown library would be the obvious answer, and it is the wrong one
 * here: this parses one file, written by this project, in the Keep a Changelog
 * shape, and shipping a general-purpose parser and sanitizer to do it costs
 * more than it saves. The subset below is everything CHANGELOG.md actually
 * uses. Anything outside it is kept as plain text rather than guessed at, so
 * an unsupported construct shows up as itself instead of disappearing.
 *
 * The file is read at build time, so nothing here runs on a request, and the
 * only author is whoever can commit to the repository.
 */

/** A run of text, optionally a link or inline code. */
export type Span =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string };

export type ChangelogEntry = {
  /** "Unreleased", or a version such as "1.2.0". */
  version: string;
  /** ISO date when the heading carries one. */
  date: string | null;
  /** Paragraphs that sit under the version before the first group. */
  intro: Span[][];
  groups: { heading: string; items: Span[][] }[];
};

export type Changelog = {
  title: string;
  intro: Span[][];
  entries: ChangelogEntry[];
};

/** Only http(s) links are kept; anything else renders as its own text. */
function safeHref(href: string) {
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Splits a line into text, `code` and [label](href) spans. */
export function parseSpans(line: string): Span[] {
  const spans: Span[] = [];
  const pattern = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let at = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line)) !== null) {
    if (match.index > at) spans.push({ kind: "text", text: line.slice(at, match.index) });
    if (match[1] !== undefined) {
      spans.push({ kind: "code", text: match[1] });
    } else {
      const href = safeHref(match[3]);
      if (href) spans.push({ kind: "link", text: match[2], href });
      // A link we will not render as a link still has to keep its words.
      else spans.push({ kind: "text", text: match[0] });
    }
    at = match.index + match[0].length;
  }
  if (at < line.length) spans.push({ kind: "text", text: line.slice(at) });
  return spans.length ? spans : [{ kind: "text", text: "" }];
}

/** Reads "[1.2.0] - 2026-01-01" or "Unreleased" out of an h2. */
function parseVersionHeading(text: string) {
  const match = text.match(/^\[?([^\]]+?)\]?(?:\s*[-–]\s*(\d{4}-\d{2}-\d{2}))?$/);
  if (!match) return { version: text.trim(), date: null };
  return { version: match[1].trim(), date: match[2] ?? null };
}

export function parseChangelog(markdown: string): Changelog {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const changelog: Changelog = { title: "Changelog", intro: [], entries: [] };
  let entry: ChangelogEntry | null = null;
  let group: ChangelogEntry["groups"][number] | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("# ")) {
      changelog.title = line.slice(2).trim();
      continue;
    }

    if (line.startsWith("## ")) {
      entry = { ...parseVersionHeading(line.slice(3).trim()), intro: [], groups: [] };
      group = null;
      changelog.entries.push(entry);
      continue;
    }

    if (line.startsWith("### ")) {
      // A group heading outside any version would have nowhere to live; keep
      // it rather than drop it by opening an untitled entry for it.
      if (!entry) {
        entry = { version: "Unreleased", date: null, intro: [], groups: [] };
        changelog.entries.push(entry);
      }
      group = { heading: line.slice(4).trim(), items: [] };
      entry.groups.push(group);
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      const spans = parseSpans(line.slice(2).trim());
      if (group) group.items.push(spans);
      else if (entry) entry.intro.push(spans);
      else changelog.intro.push(spans);
      continue;
    }

    const spans = parseSpans(line);
    if (group) group.items.push(spans);
    else if (entry) entry.intro.push(spans);
    else changelog.intro.push(spans);
  }

  return changelog;
}
