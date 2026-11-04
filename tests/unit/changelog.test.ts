import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { parseChangelog, parseSpans } from "@/lib/changelog";

/**
 * A hand-written parser earns its place only if it is pinned down, so these
 * cover the malformed input as well as the shape CHANGELOG.md actually uses.
 * The rule throughout: an unsupported construct is kept as text, never
 * dropped, so nothing silently disappears from a published changelog.
 */

describe("parseSpans", () => {
  it("returns plain text as one span", () => {
    expect(parseSpans("just words")).toEqual([{ kind: "text", text: "just words" }]);
  });

  it("picks out inline code", () => {
    expect(parseSpans("set `DATABASE_URL` first")).toEqual([
      { kind: "text", text: "set " },
      { kind: "code", text: "DATABASE_URL" },
      { kind: "text", text: " first" },
    ]);
  });

  it("picks out a link", () => {
    expect(parseSpans("see [the spec](https://example.com/a)")).toEqual([
      { kind: "text", text: "see " },
      { kind: "link", text: "the spec", href: "https://example.com/a" },
    ]);
  });

  it("handles several spans in one line", () => {
    const spans = parseSpans("`a` and [b](https://example.com) and `c`");
    expect(spans.map((span) => span.kind)).toEqual(["code", "text", "link", "text", "code"]);
  });

  it.each([
    ["javascript:", "[x](javascript:alert(1))"],
    ["data:", "[x](data:text/html,<script>)"],
    ["a bare path", "[x](/local)"],
    ["a mailto", "[x](mailto:a@b.co)"],
  ])("keeps %s as text rather than rendering a link", (_label, line) => {
    const spans = parseSpans(line);
    expect(spans.every((span) => span.kind !== "link")).toBe(true);
    // And the words survive: nothing vanishes from the page.
    expect(spans.map((span) => span.text).join("")).toContain("x");
  });

  it("leaves an unclosed backtick as text", () => {
    expect(parseSpans("an `unclosed one")).toEqual([
      { kind: "text", text: "an `unclosed one" },
    ]);
  });

  it("leaves a malformed link as text", () => {
    expect(parseSpans("[label](")).toEqual([{ kind: "text", text: "[label](" }]);
  });

  it("returns a single empty span for an empty line", () => {
    expect(parseSpans("")).toEqual([{ kind: "text", text: "" }]);
  });
});

describe("parseChangelog", () => {
  it("reads the title from the h1", () => {
    expect(parseChangelog("# Release notes\n").title).toBe("Release notes");
  });

  it("defaults the title when there is no h1", () => {
    expect(parseChangelog("## [1.0.0] - 2026-01-01\n").title).toBe("Changelog");
  });

  it("reads a version and its date", () => {
    const [entry] = parseChangelog("## [1.2.0] - 2026-03-04\n").entries;
    expect(entry.version).toBe("1.2.0");
    expect(entry.date).toBe("2026-03-04");
  });

  it("reads a version with no date", () => {
    const [entry] = parseChangelog("## [Unreleased]\n").entries;
    expect(entry.version).toBe("Unreleased");
    expect(entry.date).toBeNull();
  });

  it("reads a version with no brackets", () => {
    expect(parseChangelog("## Unreleased\n").entries[0].version).toBe("Unreleased");
  });

  it("accepts an en dash between version and date", () => {
    const [entry] = parseChangelog("## [1.0.0] – 2026-01-02\n").entries;
    expect(entry.date).toBe("2026-01-02");
  });

  it("groups items under their heading", () => {
    const [entry] = parseChangelog(
      "## [1.0.0]\n\n### Added\n\n- one\n- two\n\n### Fixed\n\n- three\n",
    ).entries;
    expect(entry.groups.map((group) => group.heading)).toEqual(["Added", "Fixed"]);
    expect(entry.groups[0].items).toHaveLength(2);
    expect(entry.groups[1].items).toHaveLength(1);
  });

  it("accepts asterisk bullets as well as hyphens", () => {
    const [entry] = parseChangelog("## [1.0.0]\n\n### Added\n\n* one\n").entries;
    expect(entry.groups[0].items[0]).toEqual([{ kind: "text", text: "one" }]);
  });

  it("keeps prose that sits under a version before any group", () => {
    const [entry] = parseChangelog("## [1.0.0]\n\nA sentence.\n\n### Added\n\n- one\n").entries;
    expect(entry.intro).toHaveLength(1);
    expect(entry.intro[0][0].text).toBe("A sentence.");
  });

  it("keeps prose that sits before any version", () => {
    const changelog = parseChangelog("# Changelog\n\nIntro line.\n\n## [1.0.0]\n");
    expect(changelog.intro[0][0].text).toBe("Intro line.");
  });

  it("does not lose a group heading that appears before any version", () => {
    // Malformed, but the words still belong on the page.
    const changelog = parseChangelog("# Changelog\n\n### Added\n\n- one\n");
    expect(changelog.entries).toHaveLength(1);
    expect(changelog.entries[0].groups[0].items[0][0].text).toBe("one");
  });

  it("handles an empty file", () => {
    const changelog = parseChangelog("");
    expect(changelog.entries).toEqual([]);
    expect(changelog.title).toBe("Changelog");
  });

  it("handles Windows line endings", () => {
    const changelog = parseChangelog("# Changelog\r\n\r\n## [1.0.0]\r\n\r\n### Added\r\n\r\n- one\r\n");
    expect(changelog.entries[0].groups[0].items[0][0].text).toBe("one");
  });
});

describe("the real CHANGELOG.md", () => {
  // The page is generated from this file, so a change to its shape that the
  // parser cannot read should fail here rather than empty the page.
  const changelog = parseChangelog(readFileSync("CHANGELOG.md", "utf8"));

  it("has a title and at least one entry", () => {
    expect(changelog.title).toBe("Changelog");
    expect(changelog.entries.length).toBeGreaterThan(0);
  });

  it("gives every entry a version", () => {
    for (const entry of changelog.entries) expect(entry.version).toBeTruthy();
  });

  it("produces items, so the page is not empty", () => {
    const items = changelog.entries.flatMap((entry) =>
      entry.groups.flatMap((group) => group.items),
    );
    expect(items.length).toBeGreaterThan(5);
  });

  it("renders no empty spans from real content", () => {
    for (const entry of changelog.entries) {
      for (const group of entry.groups) {
        for (const item of group.items) {
          expect(item.map((span) => span.text).join("").trim()).not.toBe("");
        }
      }
    }
  });
});
