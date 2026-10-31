// Night Grammar: works backwards from a timed light to its characteristic.
// The reader holds a button while the light is lit. This module turns the
// presses into a characteristic ("Fl(2) W 10s") and finds the real lights on
// the site that fit it.
import { parse, timeline, MORSE } from "./light.js";

const fmt = (n) => (Math.round(n * 100) / 100).toString();
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const FROM_MORSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

// Split values in two at the largest ratio between neighbours, if it is large
// enough. Returns the threshold, or null when the values are all one kind.
function split(values, minRatio) {
  const s = [...values].sort((a, b) => a - b);
  let best = 1, at = null;
  for (let i = 1; i < s.length; i++) {
    const r = s[i] / s[i - 1];
    if (r > best) { best = r; at = Math.sqrt(s[i] * s[i - 1]); }
  }
  return best >= minRatio ? at : null;
}

// Every place where sorted values jump by at least minRatio: the borders
// between classes of interval (inside a group, between parts, between cycles).
function splits(values, minRatio, minStep) {
  const s = [...values].map((v) => Math.max(v, 0.05)).sort((a, b) => a - b);
  const out = [];
  for (let i = 1; i < s.length; i++) if (s[i] / s[i - 1] >= minRatio && s[i] - s[i - 1] >= minStep) out.push(Math.sqrt(s[i] * s[i - 1]));
  return out;
}

// Listed periods are almost always whole seconds, or half seconds below ten.
export function snapPeriod(p) {
  return p < 10 ? Math.round(p * 2) / 2 : Math.round(p);
}

// presses: [{ on, off }] in seconds, in order. Returns a reading, or
// { wait: "why" } when there is not enough yet.
export function infer(presses) {
  const ps = presses.filter((p) => p.off != null && p.off > p.on);
  if (ps.length < 3) return { wait: "Keep going: hold for every flash until the light has come round at least twice." };
  const span = ps[ps.length - 1].on - ps[0].on;
  let lit = 0;
  for (let i = 0; i < ps.length - 1; i++) lit += ps[i].off - ps[i].on;
  const litFraction = lit / span;

  // An occulting light is lit more than dark: its events are the eclipses.
  const occulting = litFraction > 0.62;
  const ev = occulting
    ? ps.slice(0, -1).map((p, i) => ({ start: p.off, dur: ps[i + 1].on - p.off }))
    : ps.map((p) => ({ start: p.on, dur: p.off - p.on }));
  if (ev.length < 3) return { wait: "Keep going: an occulting light needs a few eclipses to read." };

  const iv = ev.slice(1).map((e, i) => e.start - ev[i].start);
  // Groups are found from the dark between events, not from the time between
  // their starts, so that a Morse dash does not look like a gap.
  const gaps = ev.slice(1).map((e, i) => e.start - (ev[i].start + ev[i].dur));
  const cuts = splits(gaps, 1.45, 0.8);

  // One kind of interval: every event is its own group.
  if (!cuts.length) {
    const step = median(iv);
    const dur = median(ev.map((e) => e.dur));
    if (!occulting && step <= 1.3) {
      const rhythm = step >= 0.75 ? "Q" : step >= 0.375 ? "VQ" : "UQ";
      return done({ rhythm, occulting, litFraction, measured: null, cycles: ev.length, presses: ps, note: `About ${Math.round(60 / step)} flashes a minute, with no pause: continuous ${rhythm === "Q" ? "quick" : rhythm === "VQ" ? "very quick" : "ultra quick"} flashing has no period.` });
    }
    const iso = !occulting && dur / step > 0.42;
    const rhythm = occulting ? "Oc" : iso ? "Iso" : dur >= 1.3 ? "LFl" : "Fl";
    return done({ rhythm, measured: step, occulting, litFraction, cycles: ev.length - 1, presses: ps, starts: ev.map((e) => e.start), meanDur: dur, groups: rhythm === "LFl" ? [1] : undefined });
  }

  // The longest intervals end a cycle; the shortest join flashes in a group;
  // anything between them separates the parts of a composite group (1+4+3).
  const lo = cuts[0], hi = cuts[cuts.length - 1];
  const cycles = [[[ev[0]]]];
  gaps.forEach((d, i) => {
    if (d > hi) cycles.push([[]]);
    else if (d > lo) cycles[cycles.length - 1].push([]);
    const c = cycles[cycles.length - 1];
    c[c.length - 1].push(ev[i + 1]);
  });
  const sig = (c) => c.map((g) => g.length).join("+");
  // The first and last cycles may have been caught part-way, so the pattern
  // is the one most common among the cycles in between.
  const pool = cycles.length >= 3 ? cycles.slice(1, -1) : cycles.length === 2 ? cycles.slice(1) : cycles;
  const counts = {};
  pool.forEach((c) => { counts[sig(c)] = (counts[sig(c)] || 0) + 1; });
  const best = Object.keys(counts).sort((x, y) => counts[y] - counts[x])[0];
  const pattern = best.split("+").map(Number);
  const firstFull = sig(cycles[0]) === best ? 0 : 1;
  const starts = cycles.slice(firstFull).map((c) => c[0][0].start);
  if (starts.length < 2) return { wait: "Keep going: the pattern needs to come round once more to be timed." };
  const measured = (starts[starts.length - 1] - starts[0]) / (starts.length - 1);

  // What kind of flashes make up a group?
  const inner = cycles.slice(firstFull).filter((c) => sig(c) === best).flatMap((c) => c);
  const durs = inner.flat().map((e) => e.dur);
  const inGroup = [];
  inner.forEach((g) => g.forEach((e, i) => { if (i) inGroup.push(e.start - g[i - 1].start); }));
  const step = inGroup.length ? median(inGroup) : null;

  const res = { measured, occulting, litFraction, cycles: starts.length - 1, presses: ps, starts, pattern };

  if (occulting) return done({ ...res, rhythm: "Oc", groups: pattern });

  const durCut = split(durs, 1.8);
  const meanDur = durs.reduce((x, y) => x + y, 0) / durs.length;
  // Two lengths of flash inside one short group: a Morse letter. (A run of
  // five or more quick flashes ending in a long one is a south cardinal.)
  const g0 = inner[0];
  const twoLengths = durCut !== null && g0.some((e) => e.dur > durCut) && g0.some((e) => e.dur < durCut) && Math.max(...durs) - Math.min(...durs) >= 0.5;
  if (twoLengths && pattern.length === 1 && pattern[0] <= 4 && Math.max(...durs) < 4) {
    const g = g0;
    const code = g.map((e) => (e.dur > durCut ? "-" : ".")).join("");
    const letter = FROM_MORSE[code];
    if (letter) return done({ ...res, rhythm: "Mo", letter, code });
  }
  // Quick flashes in a group, perhaps with one long flash at the end.
  if (step && step <= 1.3 && pattern.length === 1) {
    const rhythm = step >= 0.75 ? "Q" : step >= 0.375 ? "VQ" : "UQ";
    const g = inner[0];
    const lastLong = durCut !== null && g[g.length - 1].dur > durCut && g.slice(0, -1).every((e) => e.dur < durCut);
    return done({ ...res, rhythm, groups: [lastLong ? pattern[0] - 1 : pattern[0]], plusLong: lastLong });
  }
  if (Math.min(...durs) >= 1.3) return done({ ...res, rhythm: "LFl", groups: pattern, meanDur });
  return done({ ...res, rhythm: "Fl", groups: pattern });
}

function done(r) {
  const groups = r.groups && !(r.groups.length === 1 && r.groups[0] === 1) ? `(${r.groups.join("+")})` : "";
  const letter = r.letter ? `(${r.letter})` : "";
  const rhythm = r.rhythm + (letter || groups) + (r.plusLong ? "+LFl" : "");
  const period = r.measured ? snapPeriod(r.measured) : null;
  return { ...r, rhythmText: rhythm, period };
}

// The shape of a characteristic, for matching: everything but colour and period.
function shape(c) {
  const g = c.groups ? c.groups.join("+") : "1";
  return [c.rhythm, c.letter || "", g, c.plusLong ? "L" : ""].join("|");
}

// A Morse letter of one length is a group flash to a watcher: O (– – –) is
// three long flashes, S (· · ·) three short ones. Returns that twin's shape.
function twin(c) {
  if (c.rhythm !== "Mo" || c.letter.length !== 1) return null;
  const code = MORSE[c.letter];
  if (/^-+$/.test(code)) return ["LFl", "", String(code.length), ""].join("|");
  if (/^\.+$/.test(code)) return ["Fl", "", String(code.length), ""].join("|");
  return null;
}

// Lights from the site whose rhythm and group fit, best first.
export function matches(reading, color, index) {
  const want = parse(reading.rhythmText + (reading.period ? ` ${reading.period}s` : ""));
  const key = shape(want);
  const out = [];
  for (const l of index) {
    let c;
    try { c = parse(l.char); } catch { continue; }
    const asTwin = shape(c) !== key && twin(c) === key;
    if (shape(c) !== key && !asTwin) continue;
    const colourFits = c.colors.includes(color) && !c.alternating;
    // A light listed without a period (a safe-water mark, a north cardinal)
    // fits any period.
    let periodGap = 0;
    if (!c.period) periodGap = 0;
    else if (reading.measured) {
      const t = timeline(c);
      periodGap = Math.abs((t.basePeriod) - reading.measured) / t.basePeriod;
    } else periodGap = 1;
    out.push({ ...l, colourFits, periodGap, close: periodGap <= 0.12, asTwin: asTwin ? `listed as Morse ${c.letter}` : "" });
  }
  return out.sort((a, b) => (b.close + b.colourFits) - (a.close + a.colourFits) || a.periodGap - b.periodGap);
}

// ---- The page ----
if (typeof document !== "undefined" && document.querySelector("#hold")) {
  const $ = (s) => document.querySelector(s);
  const index = JSON.parse($("#light-index").textContent);
  const hold = $("#hold"), trace = $("#trace"), status = $("#status"), result = $("#result");
  const reset = $("#reset");
  let presses = [], t0 = null, colour = "W", down = false;

  const now = () => performance.now() / 1000;
  const press = () => {
    if (down) return;
    down = true;
    const t = now();
    if (t0 === null) t0 = t;
    presses.push({ on: t - t0, off: null });
    hold.classList.add("lit");
    hold.setAttribute("aria-pressed", "true");
  };
  const release = () => {
    if (!down) return;
    down = false;
    presses[presses.length - 1].off = now() - t0;
    hold.classList.remove("lit");
    hold.setAttribute("aria-pressed", "false");
    read();
  };
  hold.addEventListener("pointerdown", (e) => { e.preventDefault(); hold.setPointerCapture?.(e.pointerId); press(); });
  hold.addEventListener("pointerup", release);
  hold.addEventListener("pointercancel", release);
  hold.addEventListener("contextmenu", (e) => e.preventDefault());
  hold.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); press(); } else if (e.key === " " || e.key === "Enter") e.preventDefault(); });
  hold.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); release(); } });

  reset.addEventListener("click", () => { presses = []; t0 = null; down = false; read(); drawTrace(); });
  document.querySelectorAll("[data-colour]").forEach((b) => b.addEventListener("click", () => {
    colour = b.dataset.colour;
    hold.style.setProperty("--c", `var(--lamp-${colour.toLowerCase()})`);
    document.querySelectorAll("[data-colour]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    read();
  }));

  // What you held, drawn as one long ribbon, with each measured cycle marked.
  const SVGNS = "http://www.w3.org/2000/svg";
  let lastReading = null;
  function drawTrace() {
    trace.textContent = "";
    const end = Math.max(10, ...presses.map((p) => (p.off ?? now() - t0) + 1));
    const W = 600, H = 34;
    trace.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const add = (attrs, cls) => { const r = document.createElementNS(SVGNS, "rect"); Object.entries(attrs).forEach(([k, v]) => r.setAttribute(k, v)); if (cls) r.setAttribute("class", cls); trace.appendChild(r); };
    add({ x: 0, y: 16.5, width: W, height: 1 }, "tr-base");
    const css = { W: "var(--lamp-w)", R: "var(--lamp-r)", G: "var(--lamp-g)", Y: "var(--lamp-y)" }[colour];
    for (const p of presses) {
      const off = p.off ?? now() - t0;
      const r = document.createElementNS(SVGNS, "rect");
      Object.entries({ x: (p.on / end) * W, y: 6, width: Math.max(((off - p.on) / end) * W, 1.5), height: 22, rx: 1.5 }).forEach(([k, v]) => r.setAttribute(k, v));
      r.style.fill = css;
      trace.appendChild(r);
    }
    if (lastReading && lastReading.starts) {
      for (const s of lastReading.starts) add({ x: Math.min((s / end) * W, W - 1.5), y: 0, width: 1.5, height: H }, "tr-cycle");
    }
    const step = end > 60 ? 10 : 5;
    for (let s = 0; s <= end; s += step) add({ x: Math.min((s / end) * W, W - 1), y: H - 4, width: 1, height: 4 }, "tr-tick");
    $("#trace-end").textContent = `${Math.round(end)} s`;
  }
  (function tick() { if (down) drawTrace(); requestAnimationFrame(tick); })();

  const guessEl = $("#guess");
  function read() {
    const r = presses.length ? infer(presses) : null;
    lastReading = r && !r.wait ? r : null;
    drawTrace();
    if (!r) { status.textContent = "Nothing timed yet."; result.hidden = true; return; }
    if (r.wait) { status.textContent = r.wait; result.hidden = true; return; }
    const char = `${r.rhythmText} ${colour}${r.period ? ` ${r.period}s` : ""}`;
    const bits = [];
    if (r.measured) bits.push(`You timed ${r.cycles} full round${r.cycles === 1 ? "" : "s"}, ${fmt(r.measured)} s each on average; light lists would write that as ${r.period} s.`);
    if (r.note) bits.push(r.note);
    if (r.rhythm === "Oc") bits.push(`The light was on for ${Math.round(r.litFraction * 100)}% of the time you held, so the dark is what was counted: each gap in your presses is an eclipse.`);
    if (r.rhythm === "Iso") bits.push(`Light and dark came in nearly equal halves (lit ${Math.round(r.litFraction * 100)}% of the time): isophase.`);
    if (r.rhythm === "Mo") bits.push(`Two lengths of flash, ${r.code.replace(/\./g, "short ").replace(/-/g, "long ").trim().split(" ").join(", ")}: the Morse letter ${r.letter}.`);
    if (r.rhythm === "LFl") bits.push(r.meanDur >= 2
      ? `Every flash lasted ${fmt(r.meanDur)} s on average, two seconds or more: long flashes.`
      : `Every flash lasted ${fmt(r.meanDur)} s on average. A long flash is two seconds or more, so a list may write these as short flashes; the timer reads anything over about 1.3 s as long, because a thumb tends to let go early.`);
    status.textContent = bits.join(" ");
    result.hidden = false;
    $("#guess-char").textContent = char;
    if (guessEl._player) { guessEl._player.set(char); }
    const m = matches(r, colour, index);
    const list = $("#matches");
    list.textContent = "";
    const good = m.filter((x) => x.close && x.colourFits);
    const near = m.filter((x) => !(x.close && x.colourFits)).slice(0, 4);
    $("#match-head").textContent = good.length
      ? `${good.length === 1 ? "One light" : `${good.length} lights`} on this site fit${good.length === 1 ? "s" : ""}`
      : "No light on this site fits exactly";
    for (const x of [...good, ...near]) {
      const li = document.createElement("li");
      const why = x.close && x.colourFits ? "" : !x.colourFits && x.close ? " (other colour)" : x.colourFits ? " (same rhythm, other period)" : " (same rhythm, other colour and period)";
      li.innerHTML = `<code></code> <a></a><span class="why"></span>`;
      li.querySelector("code").textContent = x.char;
      const a = li.querySelector("a");
      a.textContent = x.label;
      a.href = x.href;
      li.querySelector(".why").textContent = x.asTwin ? (why ? why.replace(")", `; ${x.asTwin})`) : ` (${x.asTwin})`) : why;
      if (!(x.close && x.colourFits)) li.classList.add("near");
      list.appendChild(li);
    }
    if (!m.length) {
      const li = document.createElement("li");
      li.className = "near";
      li.textContent = "None with this rhythm and group either. The site holds a few dozen lights; an official light list holds thousands.";
      list.appendChild(li);
    }
  }

  // Practice: an unlabelled light from the site, to time at your desk.
  const plamp = $("#practice-lamp"), pbtn = $("#practice-new"), reveal = $("#practice-reveal"), answer = $("#practice-answer");
  const pool = index.filter((l) => {
    try { const c = parse(l.char); const t = timeline(c); return c.period && !c.alternating && t.speed === 1 && c.colors.length === 1; } catch { return false; }
  });
  let pt = null, pstart = 0, pick = null;
  function newPractice() {
    let next;
    do { next = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && next === pick);
    pick = next;
    const c = parse(pick.char);
    pt = timeline(c);
    pstart = performance.now();
    plamp.style.setProperty("--c", `var(--lamp-${c.colors[0].toLowerCase()})`);
    answer.hidden = true;
    answer.textContent = "";
    reveal.disabled = false;
    pbtn.textContent = "Another light";
    reset.click();
    document.querySelector(`[data-colour="${c.colors[0]}"]`)?.click();
  }
  pbtn.addEventListener("click", newPractice);
  reveal.addEventListener("click", () => {
    if (!pick) return;
    answer.hidden = false;
    answer.innerHTML = "It was <code></code>: <a></a>.";
    answer.querySelector("code").textContent = pick.char;
    const a = answer.querySelector("a");
    a.textContent = pick.label; a.href = pick.href;
  });
  (function paint(n) {
    if (pt) {
      const t = ((n - pstart) / 1000) % pt.period;
      let acc = 0, on = false;
      for (const s of pt.seg) { if (t < acc + s.dur) { on = s.on; break; } acc += s.dur; }
      plamp.classList.toggle("on", on);
    }
    requestAnimationFrame(paint);
  })(performance.now());

  read();
}
