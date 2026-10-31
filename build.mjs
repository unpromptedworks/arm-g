// Builds the site into dist/: wraps each page in src/pages with the shared
// layout, expands <light> tags into players, copies static files, and checks
// every page for the tags CORE.md requires. No dependencies.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse, parseTiming, describe, timeline } from "./src/static/light.js";

const SITE = "https://night-grammar.unpromptedworks.com";
const OUT = "dist";
const lights = JSON.parse(readFileSync("src/lights.json", "utf8"));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function lightFigure(char, { id = "", label = "", timing = "" } = {}) {
  const c = parse(char);
  if (timing) c.timing = parseTiming(timing, c);
  const t = timeline(c);
  const reading = describe(c);
  const end = Math.round(t.period * 100) / 100;
  return `<figure class="light"${id ? ` id="${id}"` : ""} data-char="${esc(char)}"${timing ? ` data-timing="${esc(timing)}"` : ""}>
  <div class="lamp-wrap"><div class="lamp on still" style="--c:var(--lamp-${c.colors[0].toLowerCase()})" aria-hidden="true"></div></div>
  <figcaption class="light-body">
    ${label ? `<span class="light-label">${esc(label)}</span>` : ""}<code class="char">${esc(char)}</code>
    <svg class="ribbon" role="img" aria-label="${esc("One period of " + char + ", drawn as light and dark over time")}"></svg>
    <span class="axis"><span>${t.fixed ? "" : "0 s"}</span><span class="rib-end">${t.fixed ? "" : end + " s"}</span></span>
    <span class="reading">${esc(reading)}</span>
    <span class="sectors" hidden></span>
    <span class="note"></span>
    <button class="play" type="button" aria-pressed="false"${t.fixed ? " hidden" : ""}>Play</button>
  </figcaption>
</figure>`;
}

function lightCard(l) {
  const figs = l.chars.map((ch, i) => lightFigure(ch, { label: l.chars.length > 1 ? (i === 0 ? "Main light" : "Second light") : "" })).join("\n");
  const src = l.sources.map((s) => `<a href="${esc(s.url)}">${esc(s.title)}</a>`).join(", ");
  return `<article class="card" id="${l.id}">
  <h3>${esc(l.name)}</h3>
  <p class="place">${esc(l.place)}</p>
  ${figs}
  <p class="card-note">${esc(l.note)}</p>
  <p class="src">Source: ${src} (Wikipedia, CC BY-SA 4.0).</p>
</article>`;
}

function layout(meta, body, file) {
  const url = SITE + "/" + (file === "index.html" ? "" : file);
  const nav = [["index.html", "Decoder"], ["grammar.html", "The grammar"], ["cape-cod.html", "Cape Cod"], ["morse.html", "Morse"], ["time.html", "Time a light"], ["notes.html", "Notes and sources"]]
    .map(([f, n]) => `<a href="/${f === "index.html" ? "" : f}"${f === file ? ' aria-current="page"' : ""}>${n}</a>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="dark">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/atkinson-hyperlegible-next-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/style.css">
<script type="module" src="/light.js"></script>${meta.script ? `\n<script type="module" src="/${meta.script}"></script>` : ""}
</head>
<body>
<header class="top">
  <a class="mark" href="/"><span class="mark-lamp" aria-hidden="true"></span>Night Grammar</a>
  <nav>${nav}</nav>
</header>
<main>
${body}
</main>
<footer class="foot">
  <p>Night Grammar reads the flash patterns lighthouses use to name themselves. Drawn timings are typical values: the notation fixes the count, colour and period, not the length of each flash. <a href="/notes.html">How it is drawn, and sources</a>.</p>
  <p>Not for navigation: use the official light list for your waters. <a href="https://unpromptedworks.com/#about">About this site: an AI made it</a>.</p>
</footer>
</body>
</html>
`;
}

// Every real light (and every standard mark) on the site, for the timing
// tool to match against. Labels are rewritten so they stand alone in a list.
const INDEX_LABELS = {
  "cape-cod.html": { "Highland, Truro": "Highland, Cape Cod", "Chatham": "Chatham, Cape Cod", "Nauset, Eastham": "Nauset, Cape Cod", "Race Point": "Race Point, Cape Cod", "Wood End": "Wood End, Cape Cod", "Long Point": "Long Point, Cape Cod" },
  "morse.html": { "Offshore platform, UK waters": "Offshore platform, UK waters", "Its corners": "Offshore platform, red corner lights", "Safe-water mark": "Safe-water mark", "Gabicce Mare, as listed": "Gabicce Mare, Italy" },
  "grammar.html": { "North": "North cardinal mark", "East": "East cardinal mark", "South": "South cardinal mark", "West": "West cardinal mark", "North, quick": "North cardinal mark, quick", "East, quick": "East cardinal mark, quick", "South, quick": "South cardinal mark, quick", "West, quick": "West cardinal mark, quick" },
};
function lightIndex() {
  const out = lights.flatMap((l) => l.chars.slice(0, 1).map((char) => ({ char, label: l.name, href: `/#${l.id}` })));
  for (const [file, labels] of Object.entries(INDEX_LABELS)) {
    const src = readFileSync(join("src/pages", file), "utf8");
    for (const [, char, label] of src.matchAll(/<light char="([^"]+)"(?: id="[^"]+")? label="([^"]+)"/g)) {
      if (labels[label]) out.push({ char, label: labels[label], href: `/${file}` });
    }
  }
  return out;
}

function render(src) {
  const m = src.match(/^<!--(\{[\s\S]*?\})-->\n/);
  if (!m) throw new Error("page is missing its front matter");
  const meta = JSON.parse(m[1]);
  let body = src.slice(m[0].length);
  body = body.replace(/<light char="([^"]+)"(?: id="([^"]+)")?(?: label="([^"]+)")?(?: timing="([^"]+)")?><\/light>/g, (_, ch, id, label, timing) => lightFigure(ch, { id, label, timing }));
  body = body.replace(/<lights-gallery><\/lights-gallery>/g, () => `<div class="gallery">\n${lights.map(lightCard).join("\n")}\n</div>`);
  body = body.replace(/<light-index><\/light-index>/g, () => `<script type="application/json" id="light-index">${JSON.stringify(lightIndex()).replace(/</g, "\\u003c")}</script>`);
  return { meta, body };
}

function check(file, html) {
  const need = [
    /<meta name="robots" content="noindex">/,
    /<title>[^<]+<\/title>/,
    /<meta name="description" content="[^"]+">/,
    /<meta property="og:title" content="[^"]+">/,
    /<meta property="og:description" content="[^"]+">/,
    /<meta property="og:image" content="https:\/\/[^"]+">/,
    /<link rel="icon"/,
    /href="https:\/\/unpromptedworks\.com\/#about"/,
  ];
  for (const re of need) if (!re.test(html)) throw new Error(`${file}: missing ${re}`);
  if (/<light |<lights-gallery>|<light-index>/.test(html)) throw new Error(`${file}: unexpanded tag`);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "fonts"), { recursive: true });
for (const f of readdirSync("src/static")) copyFileSync(join("src/static", f), join(OUT, f));
for (const f of readdirSync("src/fonts")) copyFileSync(join("src/fonts", f), join(OUT, "fonts", f));
copyFileSync("src/_headers", join(OUT, "_headers"));

const pages = readdirSync("src/pages").filter((f) => f.endsWith(".html"));
for (const f of pages) {
  const { meta, body } = render(readFileSync(join("src/pages", f), "utf8"));
  const html = layout(meta, body, f);
  check(f, html);
  writeFileSync(join(OUT, f), html);
}
// internal links must resolve
for (const f of pages) {
  const html = readFileSync(join(OUT, f), "utf8");
  for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const target = href === "/" ? "index.html" : href.slice(1);
    if (!existsSync(join(OUT, target))) throw new Error(`${f}: broken link ${href}`);
  }
}
if (!existsSync(join(OUT, "_headers")) || !/X-Robots-Tag: noindex/.test(readFileSync(join(OUT, "_headers"), "utf8"))) throw new Error("_headers missing noindex");
console.log(`built ${pages.length} pages into ${OUT}/`);
