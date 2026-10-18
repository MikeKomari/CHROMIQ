/* PRISM restyle widget: restyle the live page you are on. Vanilla JS, no dependencies. */
(function () {
  "use strict";
  var DOCK_ID = "prism-restyle-dock";
  if (document.getElementById(DOCK_ID)) return;

  var FONTS = [
    ["Space Grotesk", "sans-serif"], ["Playfair Display", "serif"], ["Fraunces", "serif"],
    ["Archivo", "sans-serif"], ["Inter", "sans-serif"], ["Lato", "sans-serif"],
    ["IBM Plex Sans", "sans-serif"], ["DM Sans", "sans-serif"], ["IBM Plex Mono", "monospace"],
    ["JetBrains Mono", "monospace"], ["Space Mono", "monospace"], ["Fira Code", "monospace"]
  ];
  var WEIGHT_OVERRIDES = { "Lato": "400;700", "Space Mono": "400;700" };
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, LINK: 1, META: 1, TITLE: 1, HEAD: 1, BASE: 1, NOSCRIPT: 1 };
  var ICON_FONT = /icon|awesome|glyph|symbol|material|dashicons|emoji|ionicons|feather|fontello|eicons/i;
  var EXPORT_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "a", "button", "small"];
  var MAX_ELEMENTS = 5000;

  var state = {
    textScale: 100, headingScale: 100, headingFont: "", bodyFont: "",
    headingWeight: 0, bodyWeight: 0, lineHeight: 0, letterSpacing: 0, accent: ""
  };
  var infos = [];
  var touched = new Map();
  var fontLinks = {};
  var notice = null;

  function fontUrl(family) {
    var w = WEIGHT_OVERRIDES[family] || "300;400;500;600;700";
    return "https://fonts.googleapis.com/css2?family=" + family.replace(/\s+/g, "+") + ":wght@" + w + "&display=swap";
  }
  function stack(family) {
    for (var i = 0; i < FONTS.length; i++) if (FONTS[i][0] === family) return '"' + family + '", ' + FONTS[i][1];
    return '"' + family + '", sans-serif';
  }
  function median(values) {
    var s = values.slice().sort(function (a, b) { return a - b; });
    return s[Math.floor(s.length / 2)];
  }
  function round2(n) { return Math.round(n * 100) / 100; }
  function ink(hex) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.58 ? "#1a1c19" : "#ffffff";
  }

  /* Snapshot original sizes and roles once, before any change is applied. */
  function snapshot() {
    var nodes = document.body ? document.body.querySelectorAll("*") : [];
    var limit = Math.min(nodes.length, MAX_ELEMENTS);
    for (var i = 0; i < limit; i++) {
      var el = nodes[i];
      if (!(el instanceof HTMLElement) || SKIP_TAGS[el.tagName] || el.id === DOCK_ID) continue;
      var cs = getComputedStyle(el);
      if (cs.display === "none") continue;
      var own = "";
      for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 3) own += c.textContent;
      var tag = el.tagName.toLowerCase();
      var field = tag === "input" || tag === "button" || tag === "textarea" || tag === "select";
      var textual = own.trim().length > 0 || field;
      if (!textual && tag !== "a") continue;
      var cls = typeof el.className === "string" ? el.className : "";
      var type = (el.getAttribute("type") || "").toLowerCase();
      var kind = tag === "button" || (tag === "input" && /^(button|submit|reset)$/.test(type)) ||
        el.getAttribute("role") === "button" || /(^|[\s_-])(btn|button)([\s_-]|$)/i.test(cls) ? "btn"
        : tag === "a" ? "link" : "";
      infos.push({
        el: el, tag: tag, textual: textual, size: parseFloat(cs.fontSize) || 16,
        role: el.closest("h1,h2,h3,h4,h5,h6") ? "h" : el.closest("code,pre,kbd,samp,tt") ? "m" : "b",
        skipFont: ICON_FONT.test(cs.fontFamily.split(",")[0]) || ICON_FONT.test(cls),
        strong: (parseInt(cs.fontWeight, 10) || 400) >= 600, kind: kind
      });
    }
  }

  function setInline(el, prop, value) {
    var saved = touched.get(el);
    if (!saved) { saved = {}; touched.set(el, saved); }
    if (!(prop in saved)) saved[prop] = [el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)];
    el.style.setProperty(prop, value, "important");
  }
  function restoreInline() {
    touched.forEach(function (props, el) {
      Object.keys(props).forEach(function (prop) {
        if (props[prop][0]) el.style.setProperty(prop, props[prop][0], props[prop][1]);
        else el.style.removeProperty(prop);
      });
      if (el.getAttribute("style") === "") el.removeAttribute("style");
    });
    touched.clear();
  }

  function showNotice(text) {
    if (notice) { notice.textContent = text; notice.hidden = !text; }
  }
  function syncFonts() {
    var wanted = {};
    [state.headingFont, state.bodyFont].forEach(function (f) { if (f) wanted[f] = 1; });
    Object.keys(fontLinks).forEach(function (f) {
      if (!wanted[f]) { fontLinks[f].remove(); delete fontLinks[f]; }
    });
    Object.keys(wanted).forEach(function (family) {
      if (fontLinks[family]) return;
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = fontUrl(family);
      link.setAttribute("data-prism-restyle", "font");
      var warn = function () {
        showNotice("Could not load " + family + ". This site's security policy may block Google Fonts, so the font will not change.");
      };
      link.onerror = warn;
      link.onload = function () {
        if (document.fonts && document.fonts.load) {
          document.fonts.load('16px "' + family + '"').then(function (faces) {
            if (!faces || !faces.length) warn(); else showNotice("");
          }, warn);
        }
      };
      document.head.appendChild(link);
      fontLinks[family] = link;
    });
  }

  function apply() {
    restoreInline();
    syncFonts();
    var ts = state.textScale / 100, hs = state.headingScale / 100;
    infos.forEach(function (info) {
      var el = info.el;
      if (info.textual) {
        var mult = ts * (info.role === "h" ? hs : 1);
        if (mult !== 1) setInline(el, "font-size", round2(info.size * mult) + "px");
        if (!info.skipFont && info.role !== "m") {
          if (info.role === "h") {
            if (state.headingFont) setInline(el, "font-family", stack(state.headingFont));
            if (state.headingWeight) setInline(el, "font-weight", String(state.headingWeight));
          } else {
            if (state.bodyFont) setInline(el, "font-family", stack(state.bodyFont));
            if (state.bodyWeight && !info.strong) setInline(el, "font-weight", String(state.bodyWeight));
            if (state.lineHeight) setInline(el, "line-height", String(state.lineHeight));
          }
          if (state.letterSpacing) setInline(el, "letter-spacing", state.letterSpacing + "em");
        }
      }
      if (state.accent && !info.skipFont) {
        if (info.kind === "link") setInline(el, "color", state.accent);
        else if (info.kind === "btn") {
          setInline(el, "background-color", state.accent);
          setInline(el, "color", ink(state.accent));
        }
      }
    });
  }

  function buildCss() {
    var out = ["/* PRISM restyle overrides for " + String(location.href).replace(/[\r\n]+/g, " ").replace(/\*\//g, "*%2F") + " */"];
    var fams = [];
    [state.headingFont, state.bodyFont].forEach(function (f) { if (f && fams.indexOf(f) < 0) fams.push(f); });
    fams.forEach(function (f) { out.push('@import url("' + fontUrl(f) + '");'); });
    if (fams.length) out.push("");
    var body = [];
    if (state.bodyFont) body.push("  font-family: " + stack(state.bodyFont) + ";");
    if (state.bodyWeight) body.push("  font-weight: " + state.bodyWeight + ";");
    if (state.lineHeight) body.push("  line-height: " + state.lineHeight + ";");
    if (state.letterSpacing) body.push("  letter-spacing: " + state.letterSpacing + "em;");
    if (body.length) out.push("body, p, li, a, button, input, textarea, select, label, td, th, blockquote, figcaption {", body.join("\n"), "}", "");
    var head = [];
    if (state.headingFont) head.push("  font-family: " + stack(state.headingFont) + ";");
    if (state.headingWeight) head.push("  font-weight: " + state.headingWeight + ";");
    if (state.letterSpacing) head.push("  letter-spacing: " + state.letterSpacing + "em;");
    if (head.length) out.push("h1, h2, h3, h4, h5, h6 {", head.join("\n"), "}", "");
    if (state.textScale !== 100 || state.headingScale !== 100) {
      out.push("/* Font sizes: text " + state.textScale + "%, headings " + state.headingScale + "% (median size of each tag, scaled) */");
      EXPORT_TAGS.forEach(function (tag) {
        var sizes = infos.filter(function (i) { return i.tag === tag && i.textual; }).map(function (i) { return i.size; });
        if (!sizes.length) return;
        var heading = /^h[1-6]$/.test(tag);
        out.push(tag + " { font-size: " + round2(median(sizes) * (state.textScale / 100) * (heading ? state.headingScale / 100 : 1)) + "px; }");
      });
      out.push("");
    }
    if (state.accent) {
      out.push("a { color: " + state.accent + "; }");
      out.push('button, [role="button"], input[type="submit"] { background-color: ' + state.accent + "; color: " + ink(state.accent) + "; }", "");
    }
    if (out.length <= 1) out.push("/* No changes yet. */");
    return out.join("\n").replace(/\s+$/, "") + "\n";
  }

  /* ---------- UI (Shadow DOM) ---------- */
  var host = document.createElement("div");
  host.id = DOCK_ID;
  host.style.cssText = "all:initial!important;position:fixed!important;right:16px!important;bottom:16px!important;z-index:2147483647!important;display:block!important;";
  var root = host.attachShadow({ mode: "open" });

  var css = [
    ":host{all:initial}",
    "*{box-sizing:border-box}",
    ".panel{width:300px;max-width:calc(100vw - 32px);background:#1f221e;color:#d6d8ce;border:1px solid #31352e;border-radius:6px;font:13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;box-shadow:none}",
    ".head{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #31352e;cursor:grab;user-select:none;touch-action:none}",
    ".head.dragging{cursor:grabbing}",
    ".title{flex:1;font:11px 'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:#d6d8ce}",
    ".body{max-height:min(66vh,520px);overflow-y:auto;padding:10px 12px 12px;display:flex;flex-direction:column;gap:10px}",
    ".panel.collapsed .body{display:none}",
    ".panel.collapsed .head{border-bottom:0}",
    "label{display:flex;flex-direction:column;gap:4px}",
    ".row{display:flex;justify-content:space-between;gap:8px;font:11px 'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;color:#9a9e92;letter-spacing:.04em;text-transform:uppercase}",
    ".row output{color:#d6d8ce;text-transform:none}",
    "select,input[type=color]{background:#171a15;color:#d6d8ce;border:1px solid #31352e;border-radius:4px;font:inherit;padding:5px 6px}",
    "input[type=color]{padding:0;height:28px;width:100%;cursor:pointer}",
    "input[type=range]{width:100%;accent-color:#b7cc6a;margin:0}",
    "button{font:inherit;font-size:12px;background:#171a15;color:#d6d8ce;border:1px solid #31352e;border-radius:4px;padding:6px 10px;cursor:pointer}",
    "button:hover{border-color:#9a9e92}",
    "button.primary{background:#b7cc6a;border-color:#b7cc6a;color:#1a1c19}",
    "button.icon{padding:2px 8px;line-height:1.2}",
    ":focus-visible{outline:2px solid #b7cc6a;outline-offset:2px}",
    ".actions{display:flex;gap:8px;flex-wrap:wrap}",
    ".actions button{flex:1}",
    ".notice{font-size:12px;color:#e7b98a;border:1px solid #31352e;border-radius:4px;padding:6px 8px}",
    ".notice[hidden]{display:none}",
    ".hint{font-size:11px;color:#9a9e92;margin:0}",
    "@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}"
  ].join("");
  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  root.appendChild(styleEl);

  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  var refreshers = [];
  function slider(label, key, min, max, step, fmt) {
    var out = h("output", { text: fmt(state[key]) });
    var input = h("input", { type: "range", min: min, max: max, step: step, "aria-label": label });
    input.value = state[key];
    input.addEventListener("input", function () {
      state[key] = Number(input.value);
      out.textContent = fmt(state[key]);
      apply();
    });
    refreshers.push(function () { input.value = state[key]; out.textContent = fmt(state[key]); });
    return h("label", {}, [h("span", { class: "row" }, [h("span", { text: label }), out]), input]);
  }
  function fontSelect(label, key) {
    var select = h("select", { "aria-label": label }, [h("option", { value: "", text: "Original" })]);
    FONTS.forEach(function (f) { select.appendChild(h("option", { value: f[0], text: f[0] })); });
    select.addEventListener("change", function () { state[key] = select.value; apply(); });
    refreshers.push(function () { select.value = state[key]; });
    return h("label", {}, [h("span", { class: "row", text: label }), select]);
  }
  function weightSelect(label, key) {
    var select = h("select", { "aria-label": label }, [h("option", { value: "0", text: "Original" })]);
    [300, 400, 500, 600, 700].forEach(function (w) { select.appendChild(h("option", { value: String(w), text: String(w) })); });
    select.addEventListener("change", function () { state[key] = Number(select.value); apply(); });
    refreshers.push(function () { select.value = String(state[key]); });
    return h("label", {}, [h("span", { class: "row", text: label }), select]);
  }

  var lhOut = h("output", { text: "Original" });
  var lhInput = h("input", { type: "range", min: "1", max: "2.2", step: "0.05", "aria-label": "Line height" });
  lhInput.value = "1.5";
  lhInput.addEventListener("input", function () { state.lineHeight = Number(lhInput.value); lhOut.textContent = state.lineHeight.toFixed(2); apply(); });
  refreshers.push(function () { lhInput.value = state.lineHeight || "1.5"; lhOut.textContent = state.lineHeight ? state.lineHeight.toFixed(2) : "Original"; });
  var lhLabel = h("label", {}, [h("span", { class: "row" }, [h("span", { text: "Line height" }), lhOut]), lhInput]);

  var accentInput = h("input", { type: "color", "aria-label": "Accent for links and buttons" });
  accentInput.value = "#b7cc6a";
  accentInput.addEventListener("input", function () { state.accent = accentInput.value; apply(); });
  refreshers.push(function () { accentInput.value = "#b7cc6a"; });

  notice = h("div", { class: "notice", role: "status" });
  notice.hidden = true;

  var copyBtn = h("button", { class: "primary", text: "Copy CSS" });
  copyBtn.addEventListener("click", function () {
    var text = buildCss();
    var done = function (success) {
      copyBtn.textContent = success ? "Copied" : "Copy failed";
      setTimeout(function () { copyBtn.textContent = "Copy CSS"; }, 1800);
    };
    var fallback = function () {
      var ok = false;
      var area = document.createElement("textarea");
      area.value = text;
      area.style.cssText = "position:fixed;opacity:0";
      root.appendChild(area);
      area.select();
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      area.remove();
      done(ok);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    else fallback();
  });
  var resetBtn = h("button", { text: "Reset" });
  resetBtn.addEventListener("click", function () {
    state = { textScale: 100, headingScale: 100, headingFont: "", bodyFont: "", headingWeight: 0, bodyWeight: 0, lineHeight: 0, letterSpacing: 0, accent: "" };
    apply();
    refreshers.forEach(function (fn) { fn(); });
    showNotice("");
  });

  var body = h("div", { class: "body" }, [
    notice,
    slider("Text size", "textScale", "50", "200", "5", function (v) { return v + "%"; }),
    slider("Heading size", "headingScale", "50", "200", "5", function (v) { return v + "%"; }),
    fontSelect("Heading font", "headingFont"),
    weightSelect("Heading weight", "headingWeight"),
    fontSelect("Body font", "bodyFont"),
    weightSelect("Body weight", "bodyWeight"),
    lhLabel,
    slider("Letter spacing", "letterSpacing", "-0.05", "0.15", "0.005", function (v) { return Number(v).toFixed(3) + "em"; }),
    h("label", {}, [h("span", { class: "row", text: "Accent (links, buttons)" }), accentInput]),
    h("div", { class: "actions" }, [resetBtn, copyBtn]),
    h("p", { class: "hint", text: "Changes apply to this page only until you close PRISM or reload." })
  ]);

  var collapseBtn = h("button", { class: "icon", "aria-label": "Collapse panel", "aria-expanded": "true", text: "−" });
  var closeBtn = h("button", { class: "icon", "aria-label": "Close PRISM and restore the page", text: "×" });
  var head = h("div", { class: "head" }, [h("span", { class: "title", text: "PRISM · restyle" }), collapseBtn, closeBtn]);
  var panel = h("div", { class: "panel", role: "region", "aria-label": "PRISM restyle" }, [head, body]);
  root.appendChild(panel);

  collapseBtn.addEventListener("click", function () {
    var collapsed = panel.classList.toggle("collapsed");
    collapseBtn.textContent = collapsed ? "+" : "−";
    collapseBtn.setAttribute("aria-expanded", String(!collapsed));
    collapseBtn.setAttribute("aria-label", collapsed ? "Expand panel" : "Collapse panel");
  });
  closeBtn.addEventListener("click", function () {
    restoreInline();
    Object.keys(fontLinks).forEach(function (f) { fontLinks[f].remove(); });
    fontLinks = {};
    window.removeEventListener("resize", clamp);
    host.remove();
  });

  /* Dragging by the header. */
  var drag = null;
  head.addEventListener("pointerdown", function (e) {
    if (e.target !== head && e.target.className !== "title") return;
    var rect = host.getBoundingClientRect();
    drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    head.classList.add("dragging");
    head.setPointerCapture(e.pointerId);
  });
  head.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var w = host.offsetWidth, hgt = host.offsetHeight;
    var left = Math.min(Math.max(0, e.clientX - drag.dx), window.innerWidth - w);
    var top = Math.min(Math.max(0, e.clientY - drag.dy), window.innerHeight - hgt);
    host.style.setProperty("left", left + "px", "important");
    host.style.setProperty("top", top + "px", "important");
    host.style.setProperty("right", "auto", "important");
    host.style.setProperty("bottom", "auto", "important");
  });
  function endDrag(e) {
    if (!drag) return;
    drag = null;
    head.classList.remove("dragging");
    try { head.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
  }
  head.addEventListener("pointerup", endDrag);
  head.addEventListener("pointercancel", endDrag);
  function clamp() {
    if (host.style.getPropertyValue("left") === "") return;
    var rect = host.getBoundingClientRect();
    host.style.setProperty("left", Math.max(0, Math.min(rect.left, window.innerWidth - rect.width)) + "px", "important");
    host.style.setProperty("top", Math.max(0, Math.min(rect.top, window.innerHeight - rect.height)) + "px", "important");
  }
  window.addEventListener("resize", clamp);

  snapshot();
  document.documentElement.appendChild(host);
})();
