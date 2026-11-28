// Extracts records from `pdftotext -layout` output of a USCG weekly Light List PDF. Not part of the site build.
import { readFileSync, writeFileSync } from "node:fs";
const lines = readFileSync(process.argv[2], "utf8").split("\n");
const recs = []; let cur = null;
for (const ln of lines) {
  if (/Light List for Volume|^LLNR\s+Name/.test(ln)) { continue; }
  const m = ln.match(/^(\d+(?:\.\d+)?)\s+(.*?)\s*(\d\d-\d\d-\d\d\.\d+N)\s*(.*)$/);
  if (m) { cur = { llnr: m[1], name: [m[2]], posN: m[3], rest: m[4], line0: ln, lines: [] }; recs.push(cur); continue; }
  if (!cur) continue;
  const w = !cur.posW && ln.match(/^(.*?)(\d\d\d-\d\d-\d\d\.\d+W)(.*)$/);
  if (w) { cur.posW = w[2]; if (w[1].trim()) cur.name.push(w[1].trim()); cur.wrap = w[3]; cur.lines.push(" ".repeat(w[1].length + w[2].length) + w[3]); continue; }
  const nm = ln.slice(0, 28).trim();
  if (nm && ln.slice(0, 6).trim() === "" && (!cur.posW || (cur.name.length < 4 && !/Light$/.test(cur.name.join(" "))))) cur.name.push(nm);
  cur.lines.push(ln);
}
const CH = /^((?:Al\s+)?(?:F\s?Fl|LFl|Fl|FW|FR|FG|FY|Oc|Iso|IQ|VQ|UQ|Q|Mo|F)\s*(?:\([^)]*\))?\s*(?:Bu|[WRGY]+)?(?:\s+\d+(?:\.\d+)?s)?)(\s*)(.*)$/;
const out = [];
for (const r of recs) {
  const name = r.name.join(" ").replace(/\s+/g, " ").trim();
  const m = r.rest.match(CH);
  if (!m) continue;
  let char = m[1].replace(/\s+/g, " ").trim();
  let tail = m[3];
  const wrapM = (r.wrap || "").match(/^\s*(\d+(?:\.\d+)?s)\b/);
  if (!/\d+(\.\d+)?s$/.test(char) && wrapM) char += " " + wrapM[1];
  let height = null, range = null, rest = tail;
  const t2 = tail.match(/^(\d+)\s+(\d+)(\s+)(.*)$/); const t1 = tail.match(/^(\d+)(\s+)(.*)$/);
  if (t2) { height = +t2[1]; range = +t2[2]; rest = t2[4]; } else if (t1) { range = +t1[1]; rest = t1[3]; }
  // columns of structure and remarks, from the first line
  const restCol = r.line0.length - rest.length;
  const segs = rest.split(/(\s{2,})/);
  let struct = [], rem = [], remCol = null;
  if (segs.length >= 3) { struct.push(segs[0]); remCol = restCol + segs[0].length + segs[1].length; rem.push(segs.slice(2).join("")); }
  else if (restCol > 70 || /^(HORN|Obscured|Red |Lighted|Emergency|Within|Light )/.test(rest)) { remCol = restCol; rem.push(rest); }
  else struct.push(rest);
  if (remCol === null) remCol = restCol + 18;
  for (const ln of r.lines) {
    const a = ln.slice(restCol - 2, remCol - 2).trim(), b = ln.slice(remCol - 2).trim();
    if (a) struct.push(a); if (b) rem.push(b);
  }
  out.push({ llnr: r.llnr, name, pos: [r.posN, r.posW], char, height, range, structure: struct.join(" ").replace(/\s+/g, " ").trim(), remarks: rem.join(" ").replace(/\s+/g, " ").trim() });
}
writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
console.log(recs.length, out.length);
