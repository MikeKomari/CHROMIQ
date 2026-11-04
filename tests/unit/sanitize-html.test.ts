import { describe, expect, it } from "vitest";

import {
  escapeAttr,
  extractTitle,
  looksLikeSpa,
  sanitizeHtml,
  visibleTextLength,
} from "@/lib/sanitize-html";

/**
 * The sanitizer is defence in depth -- the preview frame is also sandboxed
 * without allow-scripts -- but it is the layer that runs first, so its failure
 * cases are the ones worth pinning: what it is asked to remove, and what it
 * must not mangle while removing it.
 */

const BASE = "https://example.com/page";

describe("sanitizeHtml: things that must not survive", () => {
  it("removes a script element and its contents", () => {
    const out = sanitizeHtml(`<html><head></head><body><script>alert(1)</script>hi</body></html>`, BASE);
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toContain("alert(1)");
  });

  it("removes a script element with attributes", () => {
    const out = sanitizeHtml(`<body><script type="module" src="/x.js"></script></body>`, BASE);
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toContain("x.js");
  });

  it("removes an unclosed script tag rather than leaving the opening tag", () => {
    const out = sanitizeHtml(`<body><script src="/x.js"></body>`, BASE);
    expect(out).not.toMatch(/<script/i);
  });

  it.each(["iframe", "frame", "frameset", "object", "embed", "applet"])(
    "removes a %s element",
    (tag) => {
      const out = sanitizeHtml(`<body><${tag} src="https://evil.test"></${tag}></body>`, BASE);
      expect(out.toLowerCase()).not.toContain(`<${tag}`);
    },
  );

  it("removes inline event handlers in any case and quoting style", () => {
    const out = sanitizeHtml(
      `<body><a onclick="steal()" ONMOUSEOVER='steal()' onfocus=steal() href="/x">x</a></body>`,
      BASE,
    );
    // Anchored on the attribute separator: an unanchored /on[a-z]+=/ also
    // matches "content=" in the CSP meta this function injects.
    expect(out).not.toMatch(/\son[a-z]+\s*=/i);
    // The element and its real attributes survive.
    expect(out).toContain('href="/x"');
  });

  it("removes srcdoc, which would smuggle a whole document in", () => {
    const out = sanitizeHtml(`<body><iframe-ish srcdoc="<script>x</script>"></iframe-ish></body>`, BASE);
    expect(out).not.toMatch(/srcdoc/i);
  });

  it.each([
    ["href", "javascript:alert(1)"],
    ["src", "JaVaScRiPt:alert(1)"],
    ["action", "vbscript:msgbox"],
    ["formaction", "javascript:x"],
    ["poster", "javascript:x"],
    ["data", "data:text/html;base64,PHNjcmlwdD4="],
  ])("neutralises a %s pointing at %s", (attr, value) => {
    const out = sanitizeHtml(`<body><a ${attr}="${value}">x</a></body>`, BASE);
    expect(out.toLowerCase()).not.toContain("javascript:");
    expect(out.toLowerCase()).not.toContain("vbscript:");
    expect(out.toLowerCase()).not.toContain("data:text/html");
    expect(out).toContain('="#"');
  });

  it("drops a base element so the injected one is the only one", () => {
    const out = sanitizeHtml(`<head><base href="https://evil.test/"></head><body>x</body>`, BASE);
    expect(out).not.toContain("evil.test");
    expect(out).toContain(`<base href="${BASE}">`);
  });

  it("drops http-equiv meta, which could re-point or refresh the frame", () => {
    const out = sanitizeHtml(
      `<head><meta http-equiv="refresh" content="0;url=https://evil.test"></head>`,
      BASE,
    );
    expect(out).not.toContain("evil.test");
  });

  it("drops script preloads but keeps a stylesheet link", () => {
    const out = sanitizeHtml(
      `<head><link rel="modulepreload" href="/a.js"><link rel="preload" as="script" href="/b.js"><link rel="stylesheet" href="/c.css"></head>`,
      BASE,
    );
    expect(out).not.toContain("a.js");
    expect(out).not.toContain("b.js");
    expect(out).toContain("c.css");
  });

  it("drops conditional comments while keeping ordinary ones out of the way", () => {
    const out = sanitizeHtml(`<body><!--[if IE]><script>x</script><![endif]-->ok</body>`, BASE);
    expect(out).not.toMatch(/<script/i);
    expect(out).toContain("ok");
  });

  it("unwraps noscript so its markup is not treated as inert text", () => {
    const out = sanitizeHtml(`<body><noscript><p>fallback</p></noscript></body>`, BASE);
    expect(out).not.toMatch(/noscript/i);
    expect(out).toContain("fallback");
  });
});

describe("sanitizeHtml: the injected header", () => {
  it("injects into an existing head", () => {
    const out = sanitizeHtml(`<html><head><title>t</title></head><body>x</body></html>`, BASE);
    expect(out).toContain(`<head><base href="${BASE}">`);
    expect(out).toContain("script-src 'none'");
  });

  it("creates a head when the document has only an html element", () => {
    const out = sanitizeHtml(`<html><body>x</body></html>`, BASE);
    expect(out).toMatch(/<html><head><base/);
  });

  it("prepends a head to a bare fragment", () => {
    const out = sanitizeHtml(`<p>x</p>`, BASE);
    expect(out.startsWith("<head><base")).toBe(true);
    expect(out).toContain("<p>x</p>");
  });

  it("escapes the base URL so a crafted redirect cannot break out of the attribute", () => {
    const out = sanitizeHtml(`<head></head>`, `https://example.com/"><script>alert(1)</script>`);
    expect(out).not.toMatch(/<script/i);
    expect(out).toContain("&quot;");
  });

  it("handles an empty document without throwing", () => {
    expect(() => sanitizeHtml("", BASE)).not.toThrow();
    expect(sanitizeHtml("", BASE)).toContain("<base");
  });
});

describe("escapeAttr", () => {
  it("escapes the characters that would end an attribute or open a tag", () => {
    expect(escapeAttr(`a&b"c<d`)).toBe("a&amp;b&quot;c&lt;d");
  });

  it("escapes the ampersand first, so an escape is not double-encoded wrongly", () => {
    expect(escapeAttr(`&quot;`)).toBe("&amp;quot;");
  });

  it("leaves an empty string alone", () => {
    expect(escapeAttr("")).toBe("");
  });
});

describe("extractTitle", () => {
  it("returns an empty string when there is no title", () => {
    expect(extractTitle("<html><body>x</body></html>")).toBe("");
  });

  it("returns an empty string for an empty title", () => {
    expect(extractTitle("<title></title>")).toBe("");
  });

  it("strips markup smuggled inside the title", () => {
    expect(extractTitle("<title>Hello <b>there</b></title>")).toBe("Hello there");
  });

  it("decodes the entities a title realistically carries", () => {
    expect(extractTitle("<title>A &amp; B &lt;C&gt; &quot;D&quot; &#39;E&#039;</title>")).toBe(
      `A & B <C> "D" 'E'`,
    );
  });

  it("collapses whitespace and newlines", () => {
    expect(extractTitle("<title>\n  a   b \t c\n</title>")).toBe("a b c");
  });

  it("caps a runaway title at 200 characters", () => {
    expect(extractTitle(`<title>${"x".repeat(5000)}</title>`)).toHaveLength(200);
  });

  it("reads a title with attributes on the tag", () => {
    expect(extractTitle(`<title data-x="1">ok</title>`)).toBe("ok");
  });
});

describe("visibleTextLength", () => {
  it("counts nothing in an empty document", () => {
    expect(visibleTextLength("")).toBe(0);
  });

  it("ignores style contents, comments and tags", () => {
    const html = `<body><style>.a{content:"aaaaaaaaaa"}</style><!-- aaaaaaaaaa --><div></div></body>`;
    expect(visibleTextLength(html)).toBe(0);
  });

  it("counts only the body when one is present", () => {
    const html = `<head><title>ignored heading text</title></head><body>abc</body>`;
    expect(visibleTextLength(html)).toBe(3);
  });

  it("treats entities as a single space rather than as text", () => {
    expect(visibleTextLength("<body>&nbsp;&amp;</body>")).toBe(0);
  });
});

describe("looksLikeSpa", () => {
  it.each(["root", "app", "__next", "__nuxt", "___gatsby"])(
    "flags an empty shell mounted on #%s",
    (id) => {
      expect(looksLikeSpa(`<body><div id="${id}"></div><script src="/a.js"></script></body>`)).toBe(true);
    },
  );

  it("does not flag a server-rendered page with real content", () => {
    const html = `<body><div id="root">${"word ".repeat(100)}</div></body>`;
    expect(looksLikeSpa(html)).toBe(false);
  });

  it("does not flag a page with no mount point at all", () => {
    expect(looksLikeSpa("<body><p>short</p></body>")).toBe(false);
  });

  it("ignores text that only exists inside scripts", () => {
    // A bundle inlined into the page is not content the user will see.
    const html = `<body><div id="root"></div><script>${"x".repeat(5000)}</script></body>`;
    expect(looksLikeSpa(html)).toBe(true);
  });
});
