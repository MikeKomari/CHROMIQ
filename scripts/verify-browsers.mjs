/**
 * Browser and device matrix smoke test (CHROMIQ-1006).
 *
 * CHROMIQ-902 verified one machine by hand, which is not a matrix and does not
 * survive the next change. This runs the same checks across every Playwright
 * engine that is installed -- Chromium for Chrome and Edge, Firefox, and
 * WebKit for Safari -- plus two emulated phone profiles, and prints a table.
 *
 * Usage, against a production build:
 *
 *   npm run build && npm run start &
 *   npx playwright@1.49.1 install chromium firefox webkit   # once
 *   node scripts/verify-browsers.mjs [http://localhost:3000]
 *
 * Playwright is deliberately not a dependency: this is a release check, not
 * something every `npm install` should download three browsers for.
 *
 * An engine that is not installed is reported as "not installed" rather than
 * failing the run, so a partial matrix is visible as a partial matrix. Exit
 * status is non-zero only when a check that actually ran failed.
 *
 * What an emulated phone is and is not: Playwright's device profiles set the
 * viewport, device scale factor, user agent and touch support, which is enough
 * to catch layout and pointer-target problems. They do not reproduce a real
 * phone's renderer, GPU, memory limits or font stack. A green run here is not
 * a substitute for opening the workbench on a handset.
 */

import process from "node:process";

const BASE = process.argv[2] ?? "http://localhost:3000";

const { chromium, firefox, webkit, devices } = await import("playwright");

const ENGINES = [
  { name: "Chromium (Chrome, Edge)", type: chromium },
  { name: "Firefox", type: firefox },
  { name: "WebKit (Safari)", type: webkit },
];

const PHONES = [
  { name: "iPhone 14 (emulated)", device: devices["iPhone 14"] },
  { name: "Pixel 7 (emulated)", device: devices["Pixel 7"] },
];

const results = [];

function record(engine, context, check, ok, note = "") {
  results.push({ engine, context, check, ok, note });
}

/**
 * The checks. Each one is a behaviour the backlog names: the workbench
 * renders, theme switching works, randomize changes tokens, undo puts them
 * back, compare mode opens, the system survives a reload, and the export
 * modal produces real output.
 */
async function runChecks(engine, contextName, page) {
  const check = async (name, fn) => {
    try {
      const note = await fn();
      record(engine, contextName, name, true, typeof note === "string" ? note : "");
    } catch (error) {
      record(engine, contextName, name, false, String(error.message).split("\n")[0].slice(0, 90));
    }
  };

  await page.goto(`${BASE}/workspace`, { waitUntil: "networkidle", timeout: 60_000 });

  // The inspector is a drawer below the wide breakpoint, and the theme and
  // randomize controls live inside it. Open it before driving them, or every
  // narrow context fails on an element that is simply not on screen yet.
  const openInspector = async () => {
    const toggle = page.getByRole("button", { name: "Show inspector" });
    if (await toggle.count()) await toggle.first().click();
  };

  /**
   * Brings a control in the inspector within reach: opens the drawer if it is
   * shut, and scrolls the panel to it. Narrow layouts shut the drawer again
   * once a choice is made, which is the drawer behaving correctly, so this is
   * called before each control rather than once at the start.
   */
  const reach = async (locator) => {
    if (!(await locator.count()) || !(await locator.first().isVisible())) {
      await openInspector();
      await page.waitForTimeout(350);
    }
    await locator.first().scrollIntoViewIfNeeded({ timeout: 10_000 });
    return locator.first();
  };

  /**
   * Brings a control in the canvas toolbar within reach by shutting any
   * overlay first. While the inspector drawer is open the canvas is `inert`,
   * which is deliberate -- a control behind an overlay should not be tappable
   * or tabbable -- so the drawer has to be closed, not clicked through.
   */
  const reachCanvas = async (locator) => {
    // "Collapse inspector" sits inside the drawer, so it still works while the
    // canvas is inert. The canvas toolbar's own "Hide inspector" is behind the
    // drawer and inert along with everything else there, which is the point.
    const close = page.getByRole("button", { name: "Collapse inspector" });
    if (await close.count()) {
      await close.first().click({ timeout: 10_000 });
      await page.waitForTimeout(350);
    }
    return locator.first();
  };

  await openInspector();

  await check("workspace renders", async () => {
    await page.locator(".chromiq-app").waitFor({ timeout: 20_000 });
  });

  await check("no horizontal page scroll", async () => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    if (overflow) throw new Error("the document scrolls sideways");
  });

  await check("no console errors on load", async () => {
    // Collected by the caller; see `errors` below.
  });

  await check("theme switching", async () => {
    const before = await page.evaluate(
      () => getComputedStyle(document.querySelector(".chromiq-app")).backgroundColor,
    );
    // A radio group, not buttons: the two modes are mutually exclusive, so
    // that is the right role and the right thing to drive.
    await (await reach(page.getByRole("radio", { name: "Light", exact: true }))).click({ timeout: 10_000 });
    await page.waitForTimeout(400);
    const after = await page.evaluate(
      () => getComputedStyle(document.querySelector(".chromiq-app")).backgroundColor,
    );
    if (before === after) throw new Error("the canvas did not change");
    await (await reach(page.getByRole("radio", { name: "Dark", exact: true }))).click();
    return `${before} -> ${after}`;
  });

  await check("randomize then undo", async () => {
    const read = () => page.evaluate(() => localStorage.getItem("chromiq-tokens"));
    const before = await read();
    await (await reach(page.getByRole("button", { name: /Randomi[sz]e/i }))).click({ timeout: 10_000 });
    await page.waitForTimeout(400);
    const randomized = await read();
    if (before === randomized) throw new Error("randomize changed nothing");
    // The toolbar button, not Control+Z: the workbench does not bind that
    // shortcut, so pressing it would test the browser, not CHROMIQ.
    await (await reachCanvas(page.getByRole("button", { name: "Undo" }))).click({ timeout: 10_000 });
    await page.waitForTimeout(400);
    const undone = await read();
    if (undone !== before) throw new Error("undo did not restore the tokens");
  });

  await check("persistence across reload", async () => {
    const before = await page.evaluate(() => localStorage.getItem("chromiq-tokens"));
    await page.reload({ waitUntil: "networkidle" });
    const after = await page.evaluate(() => localStorage.getItem("chromiq-tokens"));
    if (before !== after) throw new Error("tokens did not survive the reload");
  });

  await check("export produces real output", async () => {
    await page.getByRole("button", { name: /^Export/ }).first().click({ timeout: 10_000 });
    const pre = page.locator(".export-modal pre, .export-modal textarea").first();
    await pre.waitFor({ timeout: 10_000 });
    const text = await pre.innerText();
    if (!text.includes("--chromiq-")) throw new Error("the export is empty or has no tokens");
    await page.keyboard.press("Escape");
    return `${text.length} characters`;
  });
}

for (const { name, type } of ENGINES) {
  let browser;
  try {
    browser = await type.launch();
  } catch (error) {
    const missing = /Executable doesn't exist/.test(String(error.message));
    record(name, "-", "launch", false, missing ? "not installed" : String(error.message).slice(0, 80));
    continue;
  }

  const contexts = [
    { label: "desktop 1440x900", options: { viewport: { width: 1440, height: 900 } } },
    { label: "tablet 834x1112", options: { viewport: { width: 834, height: 1112 } } },
    ...PHONES.map((phone) => ({ label: phone.name, options: phone.device })),
  ];

  for (const { label, options } of contexts) {
    let context;
    try {
      context = await browser.newContext(options);
    } catch (error) {
      // WebKit refuses some device profiles; say so rather than failing.
      record(name, label, "context", false, String(error.message).slice(0, 80));
      continue;
    }
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    try {
      await runChecks(name, label, page);
    } catch (error) {
      record(name, label, "run", false, String(error.message).split("\n")[0].slice(0, 90));
    }
    // Fill in the console check now that the page has been driven.
    const entry = results.find(
      (item) => item.engine === name && item.context === label && item.check === "no console errors on load",
    );
    if (entry) {
      entry.ok = errors.length === 0;
      entry.note = errors.length ? errors[0].slice(0, 90) : "";
    }
    await context.close();
  }

  await browser.close();
}

const width = {
  engine: Math.max(...results.map((r) => r.engine.length), 6),
  context: Math.max(...results.map((r) => r.context.length), 7),
  check: Math.max(...results.map((r) => r.check.length), 5),
};
const pad = (text, n) => text.padEnd(n);

console.log(`\nCHROMIQ browser matrix against ${BASE}\n`);
for (const r of results) {
  console.log(
    `${r.ok ? "pass" : "FAIL"}  ${pad(r.engine, width.engine)}  ${pad(r.context, width.context)}  ${pad(r.check, width.check)}  ${r.note}`,
  );
}

const ran = results.filter((r) => r.note !== "not installed");
const failed = ran.filter((r) => !r.ok);
const skipped = results.filter((r) => r.note === "not installed").map((r) => r.engine);

console.log(`\n${ran.length - failed.length} of ${ran.length} checks passed.`);
if (skipped.length) {
  console.log(`Not installed, so not verified: ${skipped.join(", ")}.`);
  console.log("Install them with: npx playwright@1.49.1 install firefox webkit");
}
process.exitCode = failed.length ? 1 : 0;
