// The lens page: a revolving lens seen from above. The reader sets how many
// groups of bull's-eye panels it has, how many panels in each group, how long
// it takes to turn once and how wide each panel's beam is; the page writes the
// characteristic that machine shows and plays it in the player below
// (#lens-out). The drawing turns on the player's own clock, so a beam crosses
// the watcher exactly when the player's lamp is lit.
const NS = "http://www.w3.org/2000/svg";
const SPACING = 2.5; // panels in a group sit 2.5 beam-widths apart (the site's choice)
const r2 = (n) => Math.round(n * 100) / 100;

export function machine({ groups, panels, turn, beam }) {
  const period = r2(turn / groups);
  const flash = r2((turn * beam) / 360);
  const step = (turn * beam * SPACING) / 360; // from one flash's start to the next in a group
  const used = (panels - 1) * step + flash;
  if (used > period - flash) return { error: `${panels} panels this wide don't fit in a ${r2(360 / groups)}° slice of the lens. Use fewer panels, fewer groups or a narrower beam.` };
  const timing = [];
  for (let k = 0; k < panels; k++) {
    timing.push(flash);
    timing.push(k < panels - 1 ? r2(step - flash) : 0);
  }
  timing[timing.length - 1] = r2(period - timing.slice(0, -1).reduce((a, b) => a + b, 0));
  const word = flash >= 2 ? "LFl" : "Fl";
  const char = `${word}${panels > 1 ? `(${panels})` : ""} W ${period}s`;
  return { char, timing: timing.join(" "), period, flash, step };
}

function wedge(a, half, r) {
  const p = (d) => { const t = (d * Math.PI) / 180; return `${(Math.cos(t) * r).toFixed(2)} ${(Math.sin(t) * r).toFixed(2)}`; };
  return `M0 0 L${p(a - half)} A${r} ${r} 0 0 1 ${p(a + half)} Z`;
}

if (typeof document !== "undefined") {
  const lab = document.querySelector("#lens-lab");
  const out = document.querySelector("#lens-out");
  if (lab && out && out._player) {
    const p = out._player;
    const svg = lab.querySelector("svg");
    const rot = svg.querySelector(".ln-rot");
    const glow = svg.querySelector(".ln-glow");
    const msg = lab.querySelector(".ln-msg");
    const sums = lab.querySelector(".ln-sums");
    const inputs = {};
    for (const k of ["groups", "panels", "turn", "beam"]) {
      inputs[k] = lab.querySelector(`[name=${k}]`);
      inputs[k].addEventListener("input", () => build());
    }
    let cur = null;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    function build() {
      const v = Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, Number(el.value)]));
      for (const [k, el] of Object.entries(inputs)) lab.querySelector(`[data-show=${k}]`).textContent = el.value;
      const m = machine(v);
      if (m.error) {
        // Show nothing that belongs to the last lens that fitted.
        msg.textContent = m.error; msg.hidden = false; sums.hidden = true; out.hidden = true;
        rot.textContent = ""; cur = null; glow.classList.remove("on");
        return;
      }
      msg.hidden = true; sums.hidden = false; out.hidden = false;
      cur = { ...v, ...m };
      // Panels: k-th panel of group g starts its flash when it reaches the
      // watcher (straight down, 90°) at time g × period + k × step.
      rot.textContent = "";
      const step = (v.beam * SPACING);
      for (let g = 0; g < v.groups; g++) {
        for (let k = 0; k < v.panels; k++) {
          const a = 90 - g * (360 / v.groups) - k * step;
          const beam = document.createElementNS(NS, "path");
          beam.setAttribute("d", wedge(a, v.beam / 2, 118));
          beam.setAttribute("class", "ln-beam");
          rot.appendChild(beam);
          const pane = document.createElementNS(NS, "path");
          pane.setAttribute("d", wedge(a, Math.max(v.beam, 3.2), 30));
          pane.setAttribute("class", "ln-pane");
          rot.appendChild(pane);
        }
      }
      out.dataset.char = m.char;
      out.dataset.timing = m.timing;
      out.querySelector(".char").textContent = m.char;
      p.set(m.char);
      p.playing = !reduce; p.pausedAt = 0; p.start = performance.now();
      fixNotes();
      sums.innerHTML = `Flashes in a group: <b>${v.panels}</b>, one for each panel. Period: ${v.turn} s ÷ ${v.groups} groups = <b>${m.period} s</b>. Flash: ${v.turn} s × ${v.beam}° ÷ 360° = <b>${m.flash} s</b>${m.flash >= 2 ? ", two seconds or more, so today's grammar calls it a long flash" : ""}.`;
    }

    // The player's stock note says "Exact listed timings."; on this page the
    // dark inside a group is the site's choice, so say that instead.
    function fixNotes() {
      document.querySelectorAll(".light[data-timing] .note").forEach((n) => {
        n.textContent = n.textContent.replace("Exact listed timings.", "Flash and period as listed in 1911 or worked out from the lens; the dark inside a group is this site's choice.");
      });
    }
    lab.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => {
      const [groups, panels, turn, beam] = b.dataset.preset.split(" ");
      Object.assign(inputs.groups, { value: groups }); inputs.panels.value = panels; inputs.turn.value = turn; inputs.beam.value = beam;
      lab.querySelectorAll("[data-preset]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      build();
    }));
    lab.querySelectorAll("input").forEach((el) => el.addEventListener("input", () => lab.querySelectorAll("[data-preset]").forEach((x) => x.setAttribute("aria-pressed", "false"))));

    function frame(now) {
      if (cur && !p.error) {
        const elapsed = p.playing ? now - p.start : p.pausedAt || 0;
        const turn = cur.period * cur.groups; // the player's clock, rounded period and all
        const s = ((elapsed / 1000) * p.t.speed) % turn;
        // At s = 0 the first panel's beam has its leading edge on the watcher.
        const angle = (s / turn) * 360 - cur.beam / 2;
        rot.setAttribute("transform", `rotate(${angle.toFixed(3)})`);
        glow.classList.toggle("on", p.lamp.classList.contains("on") && p.playing);
      }
      requestAnimationFrame(frame);
    }
    build();
    requestAnimationFrame(frame);
  }
}
