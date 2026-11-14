// Builds the site into dist/: wraps each page in src/pages with the shared
// layout, expands <light> tags into players, copies static files, and checks
// every page for the tags CORE.md requires. No dependencies.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse, parseTiming, describe, timeline } from "./src/static/light.js";
import { shape, twin } from "./src/static/watch.js";

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

function sourceList(sources) {
  return sources.map((s) => `<a href="${esc(s.url)}">${esc(s.title)}</a> (${esc(s.by || "Wikipedia, CC BY-SA 4.0")})`).join("; ");
}

function lightCard(l) {
  const figs = l.chars.map((ch, i) => lightFigure(ch, { label: l.chars.length > 1 ? (i === 0 ? "Main light" : "Second light") : "" })).join("\n");
  const src = sourceList(l.sources);
  return `<article class="card" id="${l.id}">
  <h3><a href="/lights/${l.id}.html">${esc(l.name)}</a></h3>
  <p class="place">${esc(l.place)}</p>
  ${figs}
  <p class="card-note">${esc(l.note)}</p>
  <p class="src">Source: ${src}.</p>
</article>`;
}

function layout(meta, body, file) {
  const url = SITE + "/" + (file === "index.html" ? "" : file);
  const nav = [["index.html", "Decoder"], ["grammar.html", "The grammar"], ["cape-cod.html", "Cape Cod"], ["morse.html", "Morse"], ["wreck.html", "Wrecks"], ["cardinals.html", "Cardinals"], ["time.html", "Time a light"], ["lights.html", "Every light"], ["notes.html", "Notes and sources"]]
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
  "morse.html": { "Offshore platform, UK waters": "Offshore platform, UK waters", "Its corners": "Offshore platform, red corner lights", "Safe-water mark": "Safe-water mark", "Gabicce Mare, as listed": "Gabicce Mare, Italy" },
  "wreck.html": { "Emergency wreck mark": "Emergency wreck marking buoy" },
  "grammar.html": { "North": "North cardinal mark", "East": "East cardinal mark", "South": "South cardinal mark", "West": "West cardinal mark", "North, quick": "North cardinal mark, quick", "East, quick": "East cardinal mark, quick", "South, quick": "South cardinal mark, quick", "West, quick": "West cardinal mark, quick" },
};
function lightIndex() {
  const out = lights.map((l) => ({ char: l.chars[0], label: l.page === "cape-cod.html" ? `${l.name}, Cape Cod` : l.name, href: `/lights/${l.id}.html`, id: l.id }));
  for (const [file, labels] of Object.entries(INDEX_LABELS)) {
    const src = readFileSync(join("src/pages", file), "utf8");
    for (const [, char, label] of src.matchAll(/<light char="([^"]+)"(?: id="[^"]+")? label="([^"]+)"/g)) {
      if (labels[label]) out.push({ char, label: labels[label], href: `/${file}` });
    }
  }
  return out;
}

// ---- One page per real light, and the table of every light by period ----

const NAMES = { W: "white", R: "red", G: "green", Y: "yellow", Bu: "blue" };
const NUM = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const n2w = (n) => NUM[n] || String(n);
const r2 = (n) => Math.round(n * 100) / 100;
const and = (a) => (a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);
// Definitions follow CHS Chart 1, section P, as on the grammar page.
const RHYTHMS = {
  F: "Fixed: a steady light that never goes dark.",
  Fl: "Flashing: each flash is shorter than the dark after it.",
  LFl: "Long-flashing: each flash lasts two seconds or more.",
  Oc: "Occulting: lit for longer than it is dark, so the eclipse is the signal.",
  Iso: "Isophase: light and dark of equal length.",
  Q: "Quick: 50 to 79 flashes a minute.",
  VQ: "Very quick: 80 to 159 flashes a minute.",
  UQ: "Ultra quick: 160 or more flashes a minute.",
  IQ: "Interrupted quick: quick flashing broken by a regular dark pause.",
  Mo: "Morse code: the light spells a letter in short and long flashes.",
};

// The characteristic, one word at a time, in the order it is written.
function gloss(char) {
  const c = parse(char);
  const rows = [];
  for (const tok of c.src.split(" ")) {
    let m;
    if ((m = tok.match(/^(Al[.]?)?(F|Fl|LFl|Oc|Iso|Q|VQ|UQ|IQ|Mo)(\(.*\))?(\+L\.?Fl)?$/))) {
      let t = RHYTHMS[m[2]];
      if (m[1]) t = "Alternating: the colour changes in turn. " + t;
      if (c.letter) t += ` Here the letter is ${c.letter}.`;
      else if (c.groups && c.groups.length > 1) t += ` Here in groups of ${and(c.groups.map(n2w))}, in that order, ${n2w(c.groups.reduce((a, b) => a + b, 0))} flashes in all.`;
      else if (c.groups && c.groups[0] > 1) t += ` Here in groups of ${n2w(c.groups[0])}${c.rhythm === "Oc" ? " eclipses" : ""}.`;
      if (c.plusLong) t += " Then one long flash ends the group.";
      rows.push([tok, t]);
    } else if (/^((?:W|R|G|Y|Bu)+)$/.test(tok)) {
      const names = c.colors.map((k) => NAMES[k]);
      rows.push([tok, names.length === 1 ? `Colour: ${names[0]}.` : c.alternating ? `Colours: ${and(names)}, in turn.` : `Colours: ${and(names)}, by sector; which one you see depends on your bearing.`]);
    } else if (/s(ec)?$/.test(tok)) {
      const step = timeline(c).step;
      rows.push([tok, c.alternating && step && step < c.period
        ? `Period: the whole pattern, every colour included, runs once every ${c.period} seconds. A stopwatch timing from one flash to the next reads ${r2(step)} s, because each colour takes its turn; time two rounds of colour to get the listed number.`
        : `Period: the whole pattern runs once every ${c.period} seconds. Time it first, from the start of one ${c.groups && c.groups.length > 1 ? "whole sequence" : c.groups && c.groups[0] > 1 ? "group" : c.rhythm === "Oc" || c.rhythm === "Iso" ? "eclipse" : "flash"} to the start of the next.`]);
    } else if (/m$/.test(tok)) {
      rows.push([tok, `Height: the light stands ${c.height} metres above high water.`]);
    } else if (/M$/.test(tok)) {
      const parts = c.range.split("/");
      rows.push([tok, parts.length > 1 && parts.length === c.colors.length
        ? `Charted range: ${and(parts.map((p, i) => `${p} nautical miles for ${NAMES[c.colors[i]]}`))}.`
        : `Charted range: ${c.range} nautical miles.`]);
    }
  }
  if (c.whiteImplied && c.rhythm !== "F") rows.push(["", "No colour is written, so the light is white."]);
  return rows;
}

// What a watcher can measure: period, rhythm (with Morse twins), colour.
function features(char) {
  const c = parse(char);
  const t = timeline(c);
  // An alternating light's stopwatch reading is one colour's step (Nauset:
  // a flash every 5 s), not the whole colour cycle its listing gives.
  return { c, char, cycle: t.step && t.step !== t.basePeriod ? t.basePeriod : null, period: c.rhythm === "F" && !c.alternating ? null : c.period ? (t.step || t.basePeriod) : null, shape: shape(c), twin: twin(c), colour: (c.alternating ? "Al " : "") + c.colors.join("") };
}
const rhythmWord = (c) => c.src.split(" ")[0];
const colourWords = (c) => (c.alternating ? `alternating ${and(c.colors.map((k) => NAMES[k]))}` : and(c.colors.map((k) => NAMES[k])));

// How a light differs from another, in the order the site reads them.
function differences(a, b) {
  const d = [];
  if (a.period && b.period && Math.abs(a.period - b.period) / Math.max(a.period, b.period) > 0.12) d.push("period");
  else if ((a.period === null) !== (b.period === null)) d.push("period");
  const sameShape = a.shape === b.shape || (a.twin && a.twin === b.shape) || (b.twin && b.twin === a.shape);
  if (!sameShape) d.push("rhythm");
  if (a.colour !== b.colour) d.push("colour");
  return d;
}
function tellApart(a, b, d) {
  const pa = a.period ? `${r2(a.period)} s` : "no period", pb = b.period ? `${r2(b.period)} s` : "no period";
  const say = {
    period: `the period, ${pa} here against ${pb}`,
    rhythm: `the rhythm, <code>${esc(rhythmWord(a.c))}</code> here against <code>${esc(rhythmWord(b.c))}</code>`,
    colour: `the colour, ${colourWords(a.c)} here against ${colourWords(b.c)}`,
  };
  if (!d.length) {
    const twinNote = a.shape !== b.shape ? " One is written as Morse, the other as a group of flashes, but to a watcher they are the same." : "";
    return `Nothing you can see. Same period, same rhythm, same colour: only where you are tells them apart.${twinNote}`;
  }
  const sameKind = a.c.rhythm === b.c.rhythm;
  const ratio = a.period && b.period ? Math.max(a.period, b.period) / Math.min(a.period, b.period) : 0;
  const first = d[0] === "period"
    ? (ratio < 1.3 ? ` Close enough that a hurried count can blur them: time three rounds, not one.` : ratio >= 2.9 ? ` One round on a watch is enough.` : ` A single timed round settles it.`)
    : d[0] === "rhythm" ? (sameKind ? " Same clock, different count: count the flashes." : " Same clock: watch the shape of light and dark.") : " Your stopwatch reads the same at both; only your eye for colour separates them.";
  const both = d.map((k) => say[k]).join("; and ");
  return d.length === 1 ? `Only ${say[d[0]]}.${first}` : `${both[0].toUpperCase()}${both.slice(1)}.`;
}

function nearest(l, index) {
  const me = features(l.chars[0]);
  const rows = index.filter((x) => x.id !== l.id).map((x) => {
    const f = features(x.char);
    return { x, f, d: differences(me, f) };
  });
  const min = Math.min(...rows.map((r) => r.d.length));
  const cut = Math.max(min, 1);
  // Where nothing is within one difference, show only the two closest.
  const limit = min >= 2 ? 2 : 4;
  // Hardest to tell apart first: a colour-only difference, then a close
  // period, then a different count of the same rhythm.
  const hard = (r) => r.d.reduce((s, k) => s + (k === "colour" ? 0.1 : k === "period" ? (me.period && r.f.period ? Math.abs(Math.log(me.period / r.f.period)) : 1) : me.c.rhythm === r.f.c.rhythm ? 0.5 : 1), 0);
  return { me, list: rows.filter((r) => r.d.length <= cut).sort((a, b) => a.d.length - b.d.length || hard(a) - hard(b)).slice(0, limit) };
}

function lightPage(l, index) {
  const figs = l.chars.map((ch, i) => lightFigure(ch, { label: l.chars.length > 1 ? (i === 0 ? "Main light" : "Second light") : "" })).join("\n");
  const words = l.chars.map((ch, i) => `${l.chars.length > 1 ? `<h3>${i === 0 ? "Main light" : "Second light"}: <code>${esc(ch)}</code></h3>` : ""}
<table class="rule-table words"><tbody>
${gloss(ch).map(([t, g]) => `<tr><td>${esc(t)}</td><td>${esc(g)}</td></tr>`).join("\n")}
</tbody></table>`).join("\n");
  const { list } = nearest(l, index);
  const zero = list.filter((r) => !r.d.length).length;
  const far = list.length && list[0].d.length >= 2;
  const head = far ? "Nothing on this site is close to it" : zero ? `${zero === 1 ? "One light" : `${n2w(zero)[0].toUpperCase() + n2w(zero).slice(1)} lights`} on this site you cannot tell from it` : `The lights on this site nearest to it`;
  const near = list.map((r) => `<div class="near-item">
${lightFigure(r.x.char, { label: r.x.label })}
<p class="apart"><strong>What tells them apart:</strong> ${tellApart(features(l.chars[0]), r.f, r.d)} <a href="${esc(r.x.href)}">${r.x.href.startsWith("/lights/") ? "Its page" : "Where it is on the site"}</a>.</p>
</div>`).join("\n");
  const home = l.page ? `<a href="/${l.page}">${l.page === "cape-cod.html" ? "Cape Cod, read in order" : l.page}</a>, where it is read beside its neighbours` : `<a href="/#${l.id}">the decoder's gallery</a>`;
  const body = `<section class="lede light-lede">
  <p class="kicker"><a href="/lights.html">Every light</a> · ${esc(l.place)}</p>
  <h1>${esc(l.name)}</h1>
  ${figs}
  <p>${esc(l.note)}</p>
</section>
<h2>Word by word</h2>
<div class="prose">
${words}
</div>
<h2>${head}</h2>
<div class="prose"><p class="aside">Compared with every light and standard mark on the site, by what a watcher can measure, in the order this site reads them: the period first, then the rhythm and count, then the colour. Height and range are left out, because you cannot see them from the water. A period within about 12% counts as the same, as it does for <a href="/time.html">the timer</a>.</p></div>
<div class="near-list">
${near}
</div>
<h2>Sources</h2>
<div class="prose"><p class="aside">Characteristic and history: ${sourceList(l.sources)}. Read on this site in ${home}. The definitions in "Word by word" follow the Canadian Hydrographic Service's <a href="https://cartes.gc.ca/publications/chart1-carte1/sections/p-lights/lightcharacters-eng.html">Chart 1, section P</a>, as <a href="/grammar.html">the grammar page</a> does. Not for navigation: use the official light list.</p></div>`;
  const meta = {
    title: `${l.name}: ${l.chars[0]}, read word by word`,
    description: `${l.name} (${l.place}) shows ${l.chars[0]}. Played, read one word at a time, and compared with the lights it could be mistaken for.`,
  };
  return { meta, body };
}

// A static strip of the first 20 seconds, so periods can be compared down a column.
const AXIS = 20;
function strip(char) {
  const c = parse(char);
  const t = timeline(c);
  const W = 200;
  let x = 0, out = "";
  if (t.fixed) return `<svg class="strip" viewBox="0 0 ${W} 14" preserveAspectRatio="none" role="img" aria-label="${esc(`${char}: lit for all ${AXIS} seconds`)}"><rect x="0" y="2" width="${W}" height="10" style="fill:var(--lamp-${c.colors[0].toLowerCase()})"/></svg>`;
  for (let rep = 0; x < AXIS && rep < 40; rep++) {
    for (const s of t.seg) {
      if (x >= AXIS) break;
      if (s.on) {
        const col = (s.color || c.colors[0]).toLowerCase();
        out += `<rect x="${r2((x / AXIS) * W)}" y="2" width="${r2(Math.max(0.6, (Math.min(s.dur, AXIS - x) / AXIS) * W))}" height="10" style="fill:var(--lamp-${col})"/>`;
      }
      x += s.dur;
    }
    if (t.fixed) break;
  }
  return `<svg class="strip" viewBox="0 0 ${W} 14" preserveAspectRatio="none" role="img" aria-label="${esc(`The first ${AXIS} seconds of ${char}`)}"><rect x="0" y="6.5" width="${W}" height="1" class="strip-base"/>${out}</svg>`;
}

function lightTable() {
  const rows = lightIndex().map((x) => ({ ...x, f: features(x.char) }));
  const groups = new Map();
  for (const r of rows) {
    const k = r.f.period ? r2(r.f.period) : "none";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const keys = [...groups.keys()].sort((a, b) => (a === "none") - (b === "none") || a - b);
  return `<div class="table-wrap"><table class="rule-table every">
<thead><tr><th>Characteristic</th><th>Light or mark</th><th>The first ${AXIS} seconds</th></tr></thead>
${keys.map((k) => {
    const g = groups.get(k);
    const head = k === "none" ? "No period: fixed, or listed without one" : `Period ${k} s${g.length > 1 ? `: ${n2w(g.length)} share it` : ""}`;
    return `<tbody><tr class="per"><th colspan="3">${head}</th></tr>
${g.map((r) => `<tr><td><code>${esc(r.char)}</code></td><td><a href="${esc(r.href)}">${esc(r.label)}</a></td><td>${strip(r.char)}${r.f.period > AXIS ? `<small>continues to ${r2(r.f.period)} s</small>` : ""}${r.f.cycle ? `<small>each colour repeats the rhythm every ${r2(r.f.period)} s; listed as ${r2(r.f.cycle)} s, the whole colour cycle</small>` : ""}</td></tr>`).join("\n")}
</tbody>`;
  }).join("\n")}
</table></div>`;
}

function render(src) {
  const m = src.match(/^<!--(\{[\s\S]*?\})-->\n/);
  if (!m) throw new Error("page is missing its front matter");
  const meta = JSON.parse(m[1]);
  let body = src.slice(m[0].length);
  body = body.replace(/<light char="([^"]+)"(?: id="([^"]+)")?(?: label="([^"]+)")?(?: timing="([^"]+)")?><\/light>/g, (_, ch, id, label, timing) => lightFigure(ch, { id, label, timing }));
  body = body.replace(/<lights-gallery><\/lights-gallery>/g, () => `<div class="gallery">\n${lights.filter((l) => l.gallery !== false).map(lightCard).join("\n")}\n</div>`);
  body = body.replace(/<light-table><\/light-table>/g, () => lightTable());
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
mkdirSync(join(OUT, "lights"), { recursive: true });
const index = lightIndex();
const lightFiles = [];
for (const l of lights) {
  const f = `lights/${l.id}.html`;
  const { meta, body } = lightPage(l, index);
  const html = layout(meta, body, f);
  check(f, html);
  writeFileSync(join(OUT, f), html);
  lightFiles.push(f);
}
// internal links must resolve
for (const f of [...pages, ...lightFiles]) {
  const html = readFileSync(join(OUT, f), "utf8");
  for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const target = href === "/" ? "index.html" : href.slice(1);
    if (!existsSync(join(OUT, target))) throw new Error(`${f}: broken link ${href}`);
  }
}
if (!existsSync(join(OUT, "_headers")) || !/X-Robots-Tag: noindex/.test(readFileSync(join(OUT, "_headers"), "utf8"))) throw new Error("_headers missing noindex");
console.log(`built ${pages.length} pages and ${lightFiles.length} light pages into ${OUT}/`);
