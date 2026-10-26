import { describe, expect, it } from "vitest";
import {
  collectInlineStyles,
  extractDesign,
  extractPageText,
  findImports,
  findStylesheetLinks,
  looksClientRendered,
  parseColor,
  suggestTokens,
} from "@/lib/css-extract";

describe("parseColor", () => {
  it.each([
    ["#fff", "#ffffff"],
    ["#FFF", "#ffffff"],
    ["#abc", "#aabbcc"],
    ["#123456", "#123456"],
    ["#ABCDEF", "#abcdef"],
    ["#ffff", "#ffffff"], // 4-digit with alpha f
    ["#112233ff", "#112233"], // 8-digit, opaque
    ["#11223380", "#112233"], // alpha 0x80 = 128 is the threshold, kept
    ["white", "#ffffff"],
    ["BLACK", "#000000"],
    ["  #123456  ", "#123456"],
    ["#123456 !important", "#123456"],
  ])("reads %j as %s", (input, hex) => {
    expect(parseColor(input)).toBe(hex);
  });

  it("drops colors that are mostly transparent", () => {
    expect(parseColor("#11223300")).toBeNull();
    expect(parseColor("#1122337f")).toBeNull(); // alpha 127 < 128
    expect(parseColor("#fff0")).toBeNull();
    expect(parseColor("rgba(0, 0, 0, 0.2)")).toBeNull();
    expect(parseColor("rgb(0 0 0 / 10%)")).toBeNull();
    expect(parseColor("hsla(120, 50%, 50%, 0.1)")).toBeNull();
  });

  it("keeps colors that are at least half opaque", () => {
    expect(parseColor("rgba(255, 0, 0, 0.5)")).toBe("#ff0000");
    expect(parseColor("rgba(255, 0, 0, 1)")).toBe("#ff0000");
    expect(parseColor("rgb(255 0 0 / 50%)")).toBe("#ff0000");
  });

  it.each([
    ["rgb(255, 0, 0)", "#ff0000"],
    ["rgb(0 128 255)", "#0080ff"],
    ["rgb(100%, 0%, 0%)", "#ff0000"],
    ["rgba(16, 17, 15, 1)", "#10110f"],
    ["rgb(300, -5, 0)", "#ff0000"], // channels clamp
  ])("reads %s", (input, hex) => {
    expect(parseColor(input)).toBe(hex);
  });

  it.each([
    ["hsl(0, 100%, 50%)", "#ff0000"],
    ["hsl(120 100% 50%)", "#00ff00"],
    ["hsl(240deg, 100%, 50%)", "#0000ff"],
    ["hsl(0.5turn 100% 50%)", "#00ffff"],
    ["hsla(0, 0%, 100%, 1)", "#ffffff"],
    ["0 100% 50%", "#ff0000"], // shadcn-style bare triple
    ["240, 100%, 50%", "#0000ff"],
  ])("reads %s", (input, hex) => {
    expect(parseColor(input)).toBe(hex);
  });

  it("converts oklch", () => {
    expect(parseColor("oklch(1 0 0)")).toBe("#ffffff");
    expect(parseColor("oklch(0 0 0)")).toBe("#000000");
    expect(parseColor("oklch(100% 0 0)")).toBe("#ffffff");
    // oklch(0.628 0.2577 29.23) is sRGB red (#ff0000) to within rounding.
    const red = parseColor("oklch(0.628 0.2577 29.23)")!;
    expect(red).toMatch(/^#[0-9a-f]{6}$/);
    expect(parseInt(red.slice(1, 3), 16)).toBeGreaterThanOrEqual(250);
    expect(parseInt(red.slice(3, 5), 16)).toBeLessThanOrEqual(8);
    expect(parseInt(red.slice(5, 7), 16)).toBeLessThanOrEqual(8);
  });

  it.each([
    "",
    "transparent",
    "currentColor",
    "inherit",
    "red", // named colors other than white/black are not supported
    "#12",
    "#12345",
    "#1234567",
    "#gggggg",
    "rgb(1, 2)",
    "rgb(a, b, c)",
    "hsl(x, y, z)",
    "oklch(a b c)",
    "oklch(0.5 0.1)",
    "lab(50% 40 59)",
    "color-mix(in srgb, red, blue)",
    "var(--x)",
    "rgb(1,2,3",
  ])("returns null for %j", (input) => {
    expect(parseColor(input)).toBeNull();
  });
});

describe("collectInlineStyles", () => {
  it("returns the text of each <style> block in order", () => {
    const html = "<style>a{color:red}</style><p>x</p><STYLE media='print'>b{color:blue}</STYLE>";
    expect(collectInlineStyles(html)).toEqual(["a{color:red}", "b{color:blue}"]);
  });

  it("ignores style tags without a closing tag and returns nothing for plain html", () => {
    expect(collectInlineStyles("<style>a{color:red}")).toEqual([]);
    expect(collectInlineStyles("<p>hello</p>")).toEqual([]);
    expect(collectInlineStyles("")).toEqual([]);
  });

  it("does not read <style> that appears inside a <script> string", () => {
    const html = `<script>var s = "<style>fake{}</style>";</script><style>real{}</style>`;
    expect(collectInlineStyles(html)).toEqual(["real{}"]);
  });

  it("caps the number of blocks at 50", () => {
    const html = Array.from({ length: 80 }, (_, i) => `<style>.c${i}{}</style>`).join("");
    expect(collectInlineStyles(html)).toHaveLength(50);
  });
});

describe("findStylesheetLinks", () => {
  it("returns stylesheet hrefs in document order, decoding &amp;", () => {
    const html = `
      <link rel="stylesheet" href="/a.css">
      <link href='/b.css?x=1&amp;y=2' rel='stylesheet'>
      <link rel=stylesheet href=/c.css>`;
    expect(findStylesheetLinks(html)).toEqual(["/a.css", "/b.css?x=1&y=2", "/c.css"]);
  });

  it("ignores non-stylesheet links, print-only styles and links without href", () => {
    const html = `
      <link rel="icon" href="/favicon.ico">
      <link rel="preload" as="style" href="/preload.css">
      <link rel="stylesheet" href="/print.css" media="print">
      <link rel="stylesheet">
      <link rel="stylesheet" href="/screen.css" media="screen">`;
    expect(findStylesheetLinks(html)).toEqual(["/screen.css"]);
  });

  it("matches rel case-insensitively and in multi-token lists", () => {
    expect(findStylesheetLinks(`<link rel="Alternate STYLESHEET" href="/x.css">`)).toEqual(["/x.css"]);
  });

  it("returns an empty array when there are none", () => {
    expect(findStylesheetLinks("<html></html>")).toEqual([]);
  });
});

describe("extractPageText", () => {
  it("reads the title and up to three heading levels", () => {
    const html = `<html><head><title> My  Site </title></head><body>
      <h1>Hello <em>world</em></h1><h2>Sub</h2><h3>Deep</h3><h4>Ignored</h4></body></html>`;
    expect(extractPageText(html)).toEqual({ title: "My Site", headings: ["Hello world", "Sub", "Deep"] });
  });

  it("dedupes headings and skips empty ones", () => {
    const html = "<h1>Same</h1><h2>Same</h2><h2></h2><h3>  </h3><h3>Other</h3>";
    expect(extractPageText(html).headings).toEqual(["Same", "Other"]);
  });

  it("caps headings at 12 and clips text to 200 characters", () => {
    const many = Array.from({ length: 30 }, (_, i) => `<h2>Heading ${i}</h2>`).join("");
    expect(extractPageText(many).headings).toHaveLength(12);
    const long = extractPageText(`<h1>${"x".repeat(500)}</h1>`).headings[0];
    expect(long).toHaveLength(200);
  });

  it("returns empty values for pages with no title or headings", () => {
    expect(extractPageText("<p>hi</p>")).toEqual({ title: "", headings: [] });
    expect(extractPageText("")).toEqual({ title: "", headings: [] });
  });

  it("does not read headings inside scripts", () => {
    expect(extractPageText(`<script>"<h1>fake</h1>"</script><h1>real</h1>`).headings).toEqual(["real"]);
  });

  it("returns an empty string for an unclosed title instead of reading on forever", () => {
    expect(extractPageText("<title>never closed <h1>x</h1>").title).toBe("");
  });
});

describe("findImports", () => {
  it("finds url(), quoted and bare @import forms", () => {
    const css = `
      @import url("https://fonts.example/a.css");
      @import url('b.css');
      @import url(c.css);
      @import "d.css" screen;
      @import 'e.css';
      @IMPORT f.css;`;
    expect(findImports(css)).toEqual([
      "https://fonts.example/a.css",
      "b.css",
      "c.css",
      "d.css",
      "e.css",
      "f.css",
    ]);
  });

  it("ignores imports in comments and returns [] when there are none", () => {
    expect(findImports("/* @import 'x.css'; */ a { color: red }")).toEqual([]);
    expect(findImports("")).toEqual([]);
  });
});

describe("looksClientRendered", () => {
  it("is true for an empty SPA shell with a root element", () => {
    expect(looksClientRendered(`<html><body><div id="root"></div><script src="/app.js"></script></body></html>`)).toBe(true);
    expect(looksClientRendered(`<body><div id="__next"></div></body>`)).toBe(true);
    expect(looksClientRendered(`<body><div id="app"></div></body>`)).toBe(true);
    expect(looksClientRendered(`<body><div id="__nuxt"></div></body>`)).toBe(true);
  });

  it("is false when the body has substantial server-rendered text", () => {
    const text = "Lorem ipsum dolor sit amet. ".repeat(40);
    expect(looksClientRendered(`<body><div id="root"><p>${text}</p></div></body>`)).toBe(false);
  });

  it("is false for a small static page without a client root", () => {
    expect(looksClientRendered("<body><h1>Hi</h1><p>Short page.</p></body>")).toBe(false);
  });

  it("ignores <noscript> text when judging how much content there is", () => {
    const warning = "Please enable JavaScript to run this app. ".repeat(20);
    expect(looksClientRendered(`<body><noscript>${warning}</noscript><div id="root"></div></body>`)).toBe(true);
  });

  it("does not count script text as content", () => {
    const code = "var x = 1; ".repeat(200);
    expect(looksClientRendered(`<body><div id="root"></div><script>${code}</script></body>`)).toBe(true);
  });

  it("is false for empty input", () => {
    expect(looksClientRendered("")).toBe(false);
  });
});

describe("extractDesign", () => {
  const css = `
    :root {
      --background: #ffffff;
      --foreground: #111111;
      --primary: #3355ff;
      --muted-foreground: #666666;
      --border: #dddddd;
      --radius: 0.5rem;
      --font-sans: "Inter", sans-serif;
      --font-mono: "JetBrains Mono", monospace;
    }
    .dark {
      --background: #0b0b0b;
      --foreground: #eeeeee;
      --primary: #88aaff;
    }
    body { background: var(--background); color: var(--foreground); font-family: "Inter", sans-serif; }
    h1 { font-family: "Playfair Display", serif; }
    code { font-family: "JetBrains Mono", monospace; }
    .btn { background-color: var(--primary); border-radius: 8px; color: #fff; }
    .card { border: 1px solid var(--border); border-radius: 12px; }
  `;
  const result = extractDesign("<html><body></body></html>", css);

  it("resolves custom properties declared on :root, and keeps dark ones apart", () => {
    expect(result.variables["--primary"]).toBe("#3355ff");
    expect(result.variables["--radius"]).toBe("0.5rem");
    expect(result.darkVariables["--primary"]).toBe("#88aaff");
    expect(result.darkVariables["--background"]).toBe("#0b0b0b");
    expect(result.variables["--background"]).toBe("#ffffff");
  });

  it("ranks named variables as role candidates for both themes", () => {
    const bg = result.candidates.light.background.map((c) => c.hex);
    expect(bg).toContain("#ffffff");
    expect(result.candidates.light.accent.map((c) => c.hex)).toContain("#3355ff");
    expect(result.candidates.light.foreground.map((c) => c.hex)).toContain("#111111");
    expect(result.candidates.light.line.map((c) => c.hex)).toContain("#dddddd");
    expect(result.candidates.light.muted.map((c) => c.hex)).toContain("#666666");
    expect(result.candidates.dark.background.map((c) => c.hex)).toContain("#0b0b0b");
    expect(result.candidates.dark.accent.map((c) => c.hex)).toContain("#88aaff");
  });

  it("counts colors by usage across themes, most frequent first", () => {
    expect(result.colors.length).toBeGreaterThan(0);
    for (const { hex } of result.colors) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    const counts = result.colors.map((c) => c.count);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
    expect(result.colors.find((c) => c.hex === "#ffffff")).toBeDefined();
  });

  it("groups font families by role", () => {
    expect(result.fonts.body.Inter).toBeGreaterThan(0);
    expect(result.fonts.display["Playfair Display"]).toBeGreaterThan(0);
    expect(result.fonts.mono["JetBrains Mono"]).toBeGreaterThan(0);
  });

  it("collects border radii in px, including rem conversions from radius variables", () => {
    expect(result.radii).toContain(8);
    expect(result.radii).toContain(12);
    expect(result.radii.filter((r) => r === 8).length).toBeGreaterThanOrEqual(1); // 0.5rem -> 8px
  });

  it("is not marked stopped or unsupported for ordinary input", () => {
    expect(result.stopped).toBe(false);
    expect(result.unsupported).toBe(0);
  });

  it("follows var() chains, using fallbacks and ignoring cycles", () => {
    const out = extractDesign(
      "",
      `:root { --brand: #112233; --primary: var(--brand); --deep: var(--primary); --loop-a: var(--loop-b); --loop-b: var(--loop-a); --fb: var(--missing, #445566); }`,
    );
    expect(out.variables["--primary"]).toBe("#112233");
    expect(out.variables["--deep"]).toBe("#112233");
    expect(out.variables["--fb"]).toBe("#445566");
    expect(out.variables["--loop-a"]).toContain("var(");
  });

  it("splits light-dark() values into both themes", () => {
    const out = extractDesign("", `:root { --background: light-dark(#ffffff, #101010); --primary: light-dark(#0000ff, #8888ff); }`);
    expect(out.variables["--background"]).toBe("#ffffff");
    expect(out.darkVariables["--background"]).toBe("#101010");
    expect(out.candidates.dark.accent.map((c) => c.hex)).toContain("#8888ff");
  });

  it("treats a prefers-color-scheme: dark media query as the dark theme", () => {
    const out = extractDesign("", `:root { --primary: #0000ff } @media (prefers-color-scheme: dark) { :root { --primary: #9999ff } }`);
    expect(out.variables["--primary"]).toBe("#0000ff");
    expect(out.darkVariables["--primary"]).toBe("#9999ff");
  });

  it("reads inline style attributes from the html", () => {
    const out = extractDesign(`<div style="background: #abcdef; border-radius: 6px"></div>`, "");
    expect(out.colors.map((c) => c.hex)).toContain("#abcdef");
    expect(out.radii).toContain(6);
  });

  it("counts unsupported color functions instead of guessing", () => {
    const out = extractDesign("", `a { color: lab(50% 40 59); background: color-mix(in srgb, red, blue) } b { color: #112233 }`);
    expect(out.unsupported).toBe(2);
    expect(out.colors.map((c) => c.hex)).toEqual(["#112233"]);
  });

  it("ignores colors inside url() values and comments", () => {
    const out = extractDesign("", `/* a { color: #aaaaaa } */ a { background: url("x.png?c=#bbbbbb") #cccccc }`);
    const hexes = out.colors.map((c) => c.hex);
    expect(hexes).toContain("#cccccc");
    expect(hexes).not.toContain("#aaaaaa");
    expect(hexes).not.toContain("#bbbbbb");
  });

  it("returns an empty extraction for empty input", () => {
    const out = extractDesign("", "");
    expect(out.colors).toEqual([]);
    expect(out.variables).toEqual({});
    expect(out.radii).toEqual([]);
    expect(out.stopped).toBe(false);
  });

  it("survives malformed CSS", () => {
    for (const bad of ["{{{", "}}}", "a { color: ", "@media {", ":root { --x: ; }", "\\", '"unterminated']) {
      expect(() => extractDesign("", bad), bad).not.toThrow();
    }
  });

  it("uses a body background/color rule as the top background/foreground candidate", () => {
    const out = extractDesign("", `body { background: #fafafa; color: #202020 }`);
    expect(out.candidates.light.background[0]).toMatchObject({ hex: "#fafafa", source: "rule" });
    expect(out.candidates.light.foreground[0]).toMatchObject({ hex: "#202020", source: "rule" });
  });
});

describe("suggestTokens", () => {
  const baseCss = `
    :root {
      --background: #ffffff; --foreground: #111111; --primary: #3355ff;
      --muted-foreground: #666666; --border: #dddddd; --radius: 8px;
      --font-sans: "Inter", sans-serif; --font-mono: "IBM Plex Mono", monospace;
    }
    .dark { --background: #0b0b0b; --foreground: #eeeeee; --primary: #88aaff; --muted-foreground: #aaaaaa; --border: #222222; }
    h1 { font-family: "Fraunces", serif }
    .a { border-radius: 8px } .b { border-radius: 8px } .c { border-radius: 12px } .d { border-radius: 4px }
  `;
  const suggestion = suggestTokens(extractDesign("", baseCss));

  it("suggests light and dark colors from named variables", () => {
    expect(suggestion.tokens).toMatchObject({
      paper: "#ffffff",
      ink: "#111111",
      accent: "#3355ff",
      muted: "#666666",
      line: "#dddddd",
      darkPaper: "#0b0b0b",
      darkInk: "#eeeeee",
      darkAccent: "#88aaff",
      darkMuted: "#aaaaaa",
      darkLine: "#222222",
    });
  });

  it("only suggests catalog fonts and notes the ones it skipped", () => {
    expect(suggestTokens(extractDesign("", `body { font-family: "Inter", sans-serif } code { font-family: "Fira Code", monospace }`)).tokens).toMatchObject({
      bodyFont: "Inter",
      monoFont: "Fira Code",
    });
    const unknown = suggestTokens(extractDesign("", `body { font-family: "Totally Custom Sans", sans-serif }`));
    expect(unknown.tokens.bodyFont).toBeUndefined();
    expect(unknown.notes.some((n) => n.includes('"Totally Custom Sans"') && n.includes("not in CHROMIQ's font catalog"))).toBe(true);
    expect(unknown.confidence.type).toBe("low");
  });

  it("picks the median radius, clamped to 0-32", () => {
    expect(suggestion.tokens.radius).toBe(8);
    expect(suggestTokens(extractDesign("", `a{border-radius:100px}`)).tokens.radius).toBeUndefined(); // >= 100px is a pill, not a radius
  });

  it("clamps big radii to 32", () => {
    expect(suggestTokens(extractDesign("", `a{border-radius:60px}`)).tokens.radius).toBe(32);
  });

  it("reports high color confidence when paper, ink and an accent are all found", () => {
    expect(suggestion.confidence.color).toBe("high");
    expect(suggestion.confidence.shape).toBe("high");
  });

  it("scores shape confidence from the number of radii seen", () => {
    expect(suggestTokens(extractDesign("", `a{border-radius:4px}`)).confidence.shape).toBe("low");
    expect(suggestTokens(extractDesign("", `a{border-radius:4px} b{border-radius:6px}`)).confidence.shape).toBe("medium");
  });

  it("notes a missing dark theme", () => {
    const out = suggestTokens(extractDesign("", `body { background: #fff; color: #111 }`));
    expect(out.notes).toContain("No dark theme found, so dark colors were left alone.");
    expect(out.tokens.darkPaper).toBeUndefined();
  });

  it("warns about low-contrast suggestions with the measured ratio", () => {
    const out = suggestTokens(extractDesign("", `:root { --background: #ffffff; --foreground: #cccccc }`));
    expect(out.notes).toContain("Light text on background is 1.61:1, below 4.5:1.");
  });

  it("notes unsupported color syntax with correct pluralisation", () => {
    const one = suggestTokens(extractDesign("", `a{color:lab(50% 1 1)}`));
    expect(one.notes.some((n) => n.startsWith("1 color declaration use lab()"))).toBe(true);
    const two = suggestTokens(extractDesign("", `a{color:lab(50% 1 1)} b{color:lch(50% 1 1)}`));
    expect(two.notes.some((n) => n.startsWith("2 color declarations use lab()"))).toBe(true);
  });

  it("returns no tokens, low confidence and an explanatory note for empty input", () => {
    const out = suggestTokens(extractDesign("", ""));
    expect(out.tokens).toEqual({});
    expect(out.confidence).toEqual({ color: "low", type: "low", shape: "low" });
    expect(out.notes).toContain("No readable colors were found, so no color tokens were suggested.");
  });

  it("only ever suggests valid #rrggbb colors and known token keys", () => {
    for (const [key, value] of Object.entries(suggestion.tokens))
      if (typeof value === "string" && !/Font$/.test(key)) expect(value, key).toMatch(/^#[0-9a-f]{6}$/);
  });
});
