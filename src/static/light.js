// Night Grammar: reads a light characteristic ("Fl(2) W 10s"), turns it into
// a timeline of light and dark, describes it in words, and plays it.

const COLORS = {
  W: { name: "white", css: "var(--lamp-w)" },
  R: { name: "red", css: "var(--lamp-r)" },
  G: { name: "green", css: "var(--lamp-g)" },
  Y: { name: "yellow", css: "var(--lamp-y)" },
  Bu: { name: "blue", css: "var(--lamp-bu)" },
};

const MORSE = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
  I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
  Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..", 0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-",
  5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
};

// Repetition rates follow the Canadian Hydrographic Service's Chart 1, section P:
// quick 50-79 a minute (usually 50 or 60), very quick 80-159 (usually 100 or 120),
// ultra quick 160 or more. The drawing uses 60, 120 and 240.
const QUICK = {
  Q: { cycle: 1.0, flash: 0.35, word: "quick", rate: "about 60 a minute" },
  VQ: { cycle: 0.5, flash: 0.2, word: "very quick", rate: "about 120 a minute" },
  UQ: { cycle: 0.25, flash: 0.1, word: "ultra quick", rate: "about 240 a minute" },
};

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const word = (n) => WORDS[n] || String(n);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (n) => (Math.round(n * 100) / 100).toString();
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export function parse(input) {
  const src = input.trim().replace(/\s+/g, " ");
  if (!src) throw new Error("Type a characteristic, such as Fl(2) W 10s.");
  let s = src
    .replace(/^Gp\.?\s*/i, "")
    .replace(/L\.\s?Fl/g, "LFl")
    .replace(/\bI\.\s?(Q|VQ|UQ)/g, "I$1")
    .replace(/\bAl[t]?\.\s?/g, "Al ")
    .replace(/\b(F|Fl|LFl|Oc|Iso|Q|VQ|UQ|IQ|IVQ|IUQ|Mo)\.(?=\s|\(|$)/g, "$1")
    .replace(/\s*\+\s*L\s?Fl/g, "+LFl")
    .replace(/,/g, " ");
  const tokens = s.split(" ").filter(Boolean);
  const out = { src, alternating: false, rhythm: null, groups: null, letter: null, plusLong: false, colors: [], period: null, height: null, range: null };
  for (const t of tokens) {
    let m;
    if (t === "Al") { out.alternating = true; continue; }
    if (t === "LFl" && out.rhythm && QUICK[out.rhythm]) { out.plusLong = true; continue; }
    if (!out.rhythm && (m = t.match(/^(F|Fl|LFl|Oc|Iso|Q|VQ|UQ|IQ|IVQ|IUQ|Mo)(?:\(([^)]*)\))?(\+LFl)?$/))) {
      out.rhythm = m[1];
      if (m[2] !== undefined) {
        if (m[1] === "Mo") {
          const letter = m[2].trim().toUpperCase();
          if (!/^[A-Z0-9]{1,3}$/.test(letter)) throw new Error(`Morse lights carry a letter or two, such as Mo(A); "${m[2]}" isn't one.`);
          out.letter = letter;
        } else {
          const g = m[2].split("+").map((x) => parseInt(x, 10));
          if (g.some((n) => !(n >= 1 && n <= 12))) throw new Error(`Couldn't count the groups in "(${m[2]})".`);
          out.groups = g;
        }
      }
      out.plusLong = Boolean(m[3]);
      continue;
    }
    if ((m = t.match(/^((?:W|R|G|Y|Bu)+)$/))) {
      out.colors.push(...m[1].match(/Bu|W|R|G|Y/g));
      continue;
    }
    if ((m = t.match(/^(\d+(?:\.\d+)?)s(?:ec)?$/))) { out.period = parseFloat(m[1]); continue; }
    if ((m = t.match(/^(\d+(?:\.\d+)?)m$/))) { out.height = parseFloat(m[1]); continue; }
    if ((m = t.match(/^(\d+(?:\.\d+)?)(?:\/\d+(?:\.\d+)?)*M$/))) { out.range = t.slice(0, -1); continue; }
    throw new Error(`Couldn't read "${t}". Try something like Fl(2) W 10s or Oc R 4s.`);
  }
  if (!out.rhythm) throw new Error("No rhythm found. A characteristic starts with one, such as F, Fl, Oc, Iso, Q or Mo.");
  if (out.rhythm === "Mo" && !out.letter) throw new Error("Morse lights name their letter, as in Mo(A) 8s.");
  if (!out.colors.length) { out.colors = ["W"]; out.whiteImplied = true; }
  return out;
}

// Light and dark segments for one period. Each segment: { on, dur, kind }.
function segments(c) {
  const seg = [];
  const on = (dur, kind = "flash") => seg.push({ on: true, dur, kind });
  const off = (dur) => seg.push({ on: false, dur });
  const notes = [];
  let period = c.period;
  const r = c.rhythm;

  if (r === "F") {
    period = period || 4;
    if (!c.alternating) return { seg: [{ on: true, dur: period, kind: "fixed" }], period, notes, fixed: true };
    if (c.alternating && c.colors.length > 1) {
      for (let i = 0; i < c.colors.length; i++) on(period / c.colors.length, "fixed");
    } else on(period, "fixed");
    return { seg, period, notes };
  }

  if (r === "Iso") {
    if (!period) { period = 4; notes.push("No period given; drawn at 4 s."); }
    on(period / 2, "iso"); off(period / 2);
    return { seg, period, notes };
  }

  if (r === "Fl" || r === "LFl") {
    const groups = c.groups || [1];
    const total = groups.reduce((a, b) => a + b, 0);
    if (!period) { period = r === "LFl" ? 10 : Math.max(5, total * 2.5); notes.push(`No period given; drawn at ${fmt(period)} s.`); }
    let flash, gap, groupGap;
    if (r === "LFl") { flash = 2; gap = 2; groupGap = 4; }
    else if (total === 1) { flash = clamp(period * 0.12, 0.3, 1); gap = 0; groupGap = 0; }
    else { flash = 0.5; gap = 1; groupGap = 3; }
    let lit = total * flash + (total - groups.length) * gap + (groups.length - 1) * groupGap;
    const budget = period * 0.7;
    const k = lit > budget ? budget / lit : 1;
    groups.forEach((n, gi) => {
      for (let i = 0; i < n; i++) {
        on(flash * k, r === "LFl" ? "long" : "flash");
        if (i < n - 1) off(gap * k);
      }
      if (gi < groups.length - 1) off(groupGap * k);
    });
    off(period - lit * k);
    return { seg, period, notes };
  }

  if (r === "Oc") {
    const groups = c.groups || [1];
    const total = groups.reduce((a, b) => a + b, 0);
    if (!period) { period = Math.max(4, total * 3); notes.push(`No period given; drawn at ${fmt(period)} s.`); }
    let ecl = total === 1 ? clamp(period * 0.25, 0.5, 3) : 1, gap = 1, groupGap = 3;
    let dark = total * ecl + (total - groups.length) * gap + (groups.length - 1) * groupGap;
    const budget = period * 0.6;
    const k = dark > budget ? budget / dark : 1;
    on(period - dark * k, "steady");
    groups.forEach((n, gi) => {
      for (let i = 0; i < n; i++) {
        off(ecl * k);
        if (i < n - 1) on(gap * k, "steady");
      }
      if (gi < groups.length - 1) on(groupGap * k, "steady");
    });
    return { seg, period, notes };
  }

  if (QUICK[r]) {
    const q = QUICK[r];
    if (!c.groups && !c.plusLong) {
      // Draw four seconds of a continuous rhythm, so the ribbon shows its speed.
      const n = Math.round(4 / q.cycle);
      for (let i = 0; i < n; i++) { on(q.flash); off(q.cycle - q.flash); }
      return { seg, period: n * q.cycle, notes, continuous: q.cycle };
    }
    const n = c.groups ? c.groups.reduce((a, b) => a + b, 0) : 0;
    const lit = n * q.cycle + (c.plusLong ? 2 + q.cycle : 0);
    if (!period) { period = Math.ceil(lit + 3); notes.push(`No period given; drawn at ${fmt(period)} s.`); }
    const k = lit > period * 0.85 ? (period * 0.85) / lit : 1;
    for (let i = 0; i < n; i++) { on(q.flash * k); off((q.cycle - q.flash) * k); }
    if (c.plusLong) { on(2 * k, "long"); }
    off(period - seg.reduce((a, s) => a + s.dur, 0));
    return { seg, period, notes };
  }

  if (r === "IQ" || r === "IVQ" || r === "IUQ") {
    const q = QUICK[r.slice(1)];
    if (!period) { period = 10; notes.push("No period given; drawn at 10 s."); }
    const dark = Math.max(1, period * 0.25);
    const n = Math.max(1, Math.floor((period - dark) / q.cycle));
    for (let i = 0; i < n; i++) { on(q.flash); off(q.cycle - q.flash); }
    off(period - n * q.cycle);
    return { seg, period, notes };
  }

  if (r === "Mo") {
    const code = [...c.letter].map((ch) => MORSE[ch]);
    const dot = 0.5, dash = 1.5, el = 0.5, letterGap = 1.5;
    let lit = 0;
    code.forEach((cd, li) => {
      [...cd].forEach((sym, si) => {
        lit += sym === "." ? dot : dash;
        if (si < cd.length - 1) lit += el;
      });
      if (li < code.length - 1) lit += letterGap;
    });
    if (!period) { period = Math.ceil(lit + 4); notes.push(`No period given; drawn at ${fmt(period)} s.`); }
    const k = lit > period * 0.8 ? (period * 0.8) / lit : 1;
    code.forEach((cd, li) => {
      [...cd].forEach((sym, si) => {
        on((sym === "." ? dot : dash) * k, sym === "." ? "dot" : "dash");
        if (si < cd.length - 1) off(el * k);
      });
      if (li < code.length - 1) off(letterGap * k);
    });
    off(period - lit * k);
    return { seg, period, notes };
  }
  throw new Error("Unknown rhythm.");
}

export function timeline(c) {
  const t = segments(c);
  // Colour each lit segment. Alternating lights step through their colours,
  // one per lit segment; a sectored light shows one colour, chosen by the reader.
  t.basePeriod = t.period;
  const litCount = t.seg.filter((s) => s.on).length;
  if (c.alternating && litCount < c.colors.length) {
    const n = c.colors.length;
    t.seg = Array.from({ length: n }, () => t.seg.map((s) => ({ ...s }))).flat();
    t.period *= n;
    t.notes.push(`${cap(word(n))} periods shown, so every colour appears.`);
  }
  let i = 0;
  for (const s of t.seg) {
    if (s.on) { s.color = c.alternating ? c.colors[i % c.colors.length] : null; i++; }
  }
  // Keep the playback under three flashes a second (WCAG 2.3.1).
  let minGap = Infinity, last = null, acc = 0;
  for (const s of t.seg) {
    if (s.on && last !== null) minGap = Math.min(minGap, acc - last);
    if (s.on) last = acc;
    acc += s.dur;
  }
  if (t.continuous) minGap = t.continuous;
  t.speed = minGap < 1 / 3 ? Math.floor((minGap * 3) * 10) / 10 : 1;
  return t;
}

function colorList(names) {
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(", ") + " or " + names[names.length - 1];
}

export function describe(c) {
  const t = { ...timeline(c) };
  t.period = t.basePeriod;
  const names = c.colors.map((k) => COLORS[k].name);
  const sector = !c.alternating && c.colors.length > 1;
  const col = c.alternating ? "" : sector ? "" : names[0] + " ";
  const every = (p) => `every ${fmt(p)} second${p === 1 ? "" : "s"}`;
  const g = c.groups;
  const total = g ? g.reduce((a, b) => a + b, 0) : 1;
  let s;
  switch (c.rhythm) {
    case "F":
      s = c.alternating ? `A steady light that changes colour, ${names.join(" then ")}, and never goes dark.` : `A fixed ${col}light: steady, never dark.`;
      break;
    case "Iso":
      s = `${cap(col)}light and darkness in equal halves, one full cycle ${every(c.period || t.period)}.`;
      break;
    case "Fl":
    case "LFl": {
      const kind = c.rhythm === "LFl" ? "long " : "";
      if (!g || (g.length === 1 && g[0] === 1)) s = `One ${kind}${col}flash ${every(t.period)}.`;
      else if (g.length === 1) s = `${cap(word(g[0]))} ${kind}${col}flashes close together, then darkness; the group repeats ${every(t.period)}.`;
      else s = `${cap(kind + col)}flashes in groups of ${g.map(word).slice(0, -1).join(", ")} and ${word(g[g.length - 1])}, ${word(total)} in all, the whole sequence repeating ${every(t.period)}.`;
      if (c.rhythm === "LFl") s += " A long flash lasts at least two seconds.";
      break;
    }
    case "Oc":
      if (!g || (g.length === 1 && g[0] === 1)) s = `A ${col}light that is on more than off, going dark once ${every(t.period)}.`;
      else if (g.length === 1) s = `A ${col}light that is on more than off, going dark ${g[0] === 2 ? "twice" : word(g[0]) + " times"} in quick succession ${every(t.period)}.`;
      else s = `A ${col}light that is on more than off, with eclipses in groups of ${g.map(word).join(" and ")}, ${every(t.period)}.`;
      break;
    case "Q":
    case "VQ":
    case "UQ": {
      const q = QUICK[c.rhythm];
      if (!g && !c.plusLong) s = `${cap(q.word)} ${col}flashing, ${q.rate}, without a pause.`;
      else {
        s = `${cap(word(total))} ${q.word} ${col}flashes`;
        if (c.plusLong) s += " and then one long flash";
        s += `, then darkness, repeated ${every(t.period)}.`;
      }
      break;
    }
    case "IQ":
    case "IVQ":
    case "IUQ": {
      const q = QUICK[c.rhythm.slice(1)];
      s = `Interrupted ${q.word} ${col}flashing: runs of flashes at ${q.rate}, broken by a regular dark pause, ${every(t.period)}.`;
      break;
    }
    case "Mo": {
      const code = [...c.letter].map((ch) => MORSE[ch].replace(/\./g, "·").replace(/-/g, "–").split("").join(" ")).join(" / ");
      s = `The letter${c.letter.length > 1 ? "s" : ""} ${c.letter} in Morse code (${code}), ${col ? "in " + col.trim() + ", " : ""}${every(t.period)}.`;
      break;
    }
  }
  if (c.alternating && c.rhythm !== "F") s += ` Its colour alternates: ${names.join(", then ")}.`;
  if (sector) s += ` It shows ${colorList(names)} depending on where you stand: a sectored light.`;
  if (c.height) s += ` The light stands ${fmt(c.height)} m above high water.`;
  if (c.range) s += ` Its charted range is ${c.range.replace("/", " / ")} nautical miles.`;
  s = s.replace(/\s+/g, " ").replace(/ ,/g, ",");
  return s;
}

const SVGNS = "http://www.w3.org/2000/svg";

// Draw one period as a ribbon: lit time is a bar in the light's colour.
function drawRibbon(svg, t, color) {
  svg.textContent = "";
  const W = 600, H = 48, top = 6, bh = 20;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  const base = document.createElementNS(SVGNS, "rect");
  Object.entries({ x: 0, y: top + bh / 2 - 0.5, width: W, height: 1, class: "rib-base" }).forEach(([k, v]) => base.setAttribute(k, v));
  svg.appendChild(base);
  let x = 0;
  for (const s of t.seg) {
    const w = (s.dur / t.period) * W;
    if (s.on) {
      const r = document.createElementNS(SVGNS, "rect");
      Object.entries({ x, y: top, width: Math.max(w, 1.5), height: bh, rx: 1.5 }).forEach(([k, v]) => r.setAttribute(k, v));
      r.style.fill = COLORS[s.color || color].css;
      svg.appendChild(r);
    }
    x += w;
  }
  // second ticks
  const step = t.period > 20 ? 5 : t.period > 6 ? 1 : t.period > 2 ? 0.5 : 0.25;
  for (let s = 0; s <= t.period + 1e-9; s += step) {
    const tick = document.createElementNS(SVGNS, "rect");
    const tx = Math.min((s / t.period) * W, W - 1);
    const major = Math.abs(s - Math.round(s / (step * 5)) * step * 5) < 1e-9;
    Object.entries({ x: tx, y: top + bh + 4, width: 1, height: major ? 8 : 4, class: "rib-tick" }).forEach(([k, v]) => tick.setAttribute(k, v));
    svg.appendChild(tick);
  }
  const head = document.createElementNS(SVGNS, "rect");
  Object.entries({ x: 0, y: 0, width: 2, height: top + bh + 6, class: "rib-head" }).forEach(([k, v]) => head.setAttribute(k, v));
  svg.appendChild(head);
  return head;
}

const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const players = new Set();

class Player {
  constructor(el) {
    this.el = el;
    this.lamp = el.querySelector(".lamp");
    this.svg = el.querySelector(".ribbon");
    this.desc = el.querySelector(".reading");
    this.note = el.querySelector(".note");
    this.btn = el.querySelector(".play");
    this.sectorBox = el.querySelector(".sectors");
    this.endLabel = el.querySelector(".rib-end");
    this.visible = true;
    this.playing = !reduceMotion;
    this.start = performance.now();
    if (this.btn) this.btn.addEventListener("click", () => this.toggle());
    this.set(el.dataset.char);
    players.add(this);
  }
  set(text) {
    this.error = null;
    try {
      this.c = parse(text);
      this.t = timeline(this.c);
    } catch (e) {
      this.error = e.message;
      if (this.desc) { this.desc.textContent = e.message; this.desc.classList.add("err"); }
      return false;
    }
    this.sector = this.c.colors[0];
    this.head = drawRibbon(this.svg, this.t, this.sector);
    if (this.endLabel) this.endLabel.textContent = this.t.fixed ? "" : `${fmt(this.t.period)} s`;
    if (this.btn) this.btn.hidden = Boolean(this.t.fixed);
    if (this.desc) { this.desc.textContent = describe(this.c); this.desc.classList.remove("err"); }
    const notes = [...this.t.notes];
    if (this.t.speed < 1) notes.push(`Played at ${Math.round(this.t.speed * 100)}% speed to stay under three flashes a second.`);
    if (this.note) this.note.textContent = notes.join(" ");
    this.renderSectors();
    this.start = performance.now();
    return true;
  }
  renderSectors() {
    if (!this.sectorBox) return;
    this.sectorBox.textContent = "";
    if (this.c.alternating || this.c.colors.length < 2) { this.sectorBox.hidden = true; return; }
    this.sectorBox.hidden = false;
    const label = document.createElement("span");
    label.textContent = "Stand in the ";
    this.sectorBox.appendChild(label);
    this.c.colors.forEach((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = COLORS[k].name;
      b.className = "chip";
      b.setAttribute("aria-pressed", String(k === this.sector));
      b.addEventListener("click", () => {
        this.sector = k;
        this.head = drawRibbon(this.svg, this.t, k);
        this.renderSectors();
      });
      this.sectorBox.appendChild(b);
    });
    this.sectorBox.appendChild(document.createTextNode(" sector"));
  }
  toggle() {
    this.playing = !this.playing;
    if (this.playing) this.start = performance.now() - (this.pausedAt || 0);
    else this.pausedAt = performance.now() - this.start;
    this.paint(performance.now());
  }
  paint(now) {
    if (this.error) return;
    if (this.btn) {
      this.btn.textContent = this.playing ? "Pause" : "Play";
      this.btn.setAttribute("aria-pressed", String(this.playing));
    }
    const elapsed = this.playing ? now - this.start : this.pausedAt || 0;
    const t = ((elapsed / 1000) * this.t.speed) % this.t.period;
    let acc = 0, cur = this.t.seg[0];
    for (const s of this.t.seg) { if (t < acc + s.dur) { cur = s; break; } acc += s.dur; }
    const lit = this.playing ? cur.on : true;
    const color = cur.color || this.sector;
    this.lamp.style.setProperty("--c", COLORS[color].css);
    this.lamp.classList.toggle("on", lit);
    this.lamp.classList.toggle("still", !this.playing);
    this.head.setAttribute("x", String((t / this.t.period) * 600 - 1));
  }
}

function loop(now) {
  for (const p of players) if (p.visible) p.paint(now);
  requestAnimationFrame(loop);
}

export function mount(root = document) {
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => entries.forEach((e) => { const p = e.target._player; if (p) p.visible = e.isIntersecting; }))
    : null;
  const made = [];
  root.querySelectorAll(".light").forEach((el) => {
    const p = new Player(el);
    el._player = p;
    if (io) io.observe(el);
    made.push(p);
  });
  return made;
}

if (typeof document !== "undefined") {
  const players = mount();
  const input = document.querySelector("#char-input");
  const target = players.find((p) => p.el.id === "decoder");
  if (input && target) {
    const apply = (v) => {
      if (target.set(v)) {
        target.playing = !reduceMotion; target.pausedAt = 0;
        const u = new URL(location.href);
        u.searchParams.set("c", v);
        history.replaceState(null, "", u);
      }
    };
    const q = new URLSearchParams(location.search).get("c");
    if (q) { input.value = q; apply(q); }
    input.addEventListener("input", () => apply(input.value));
    document.querySelectorAll("[data-try]").forEach((b) => b.addEventListener("click", () => {
      input.value = b.dataset.try; apply(b.dataset.try);
    }));
  }
  requestAnimationFrame(loop);
}
