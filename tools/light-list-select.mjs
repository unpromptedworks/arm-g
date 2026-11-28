// Picks the lighthouses out of an extracted USCG Light List volume and writes
// src/light-list.json. Not part of the site build.
//   pdftotext -layout v1d01WeeklyChanges.pdf v1.txt
//   node tools/light-list-extract.mjs v1.txt recs.json
//   node tools/light-list-select.mjs recs.json 2026-11-25
import { readFileSync, writeFileSync } from "node:fs";
const recs = JSON.parse(readFileSync(process.argv[2], "utf8"));
const date = process.argv[3];
// Lights already on the site from other sources, and notations the parser can't yet read.
const SKIP = { "Gay Head Light": "colour per group", "New London Ledge Light": "colour per group" };
const STATE = (n, lat, lon) => {
  const o = { "Eatons Neck": "New York", "Execution Rocks": "New York", "Horton Point": "New York", "Orient Point": "New York", "Little Gull Island": "New York", "Race Rock": "New York", "Stratford Shoal (Middle Ground)": "New York", "Montauk Point": "New York", "Shinnecock": "New York", "Coney Island": "New York", "Romer Shoal": "New York", "Sandy Hook": "New Jersey", "Portsmouth Harbor (New Castle)": "New Hampshire", "Whaleback": "Maine", "Isles of Shoals": "New Hampshire", "Block Island Southeast": "Rhode Island" };
  if (o[n]) return o[n];
  if (lat > 43.07) return "Maine";
  if (lat > 42.87) return "New Hampshire";
  if (lon < 71.13) return "Massachusetts";
  if (lon < 71.86) return "Rhode Island";
  return "Connecticut";
};
const dms = (s) => { const [d, m, x] = s.slice(0, -1).split("-").map(Number); return d + m / 60 + x / 3600; };
const tidy = (c) => c.replace(/^F([WRGY])$/, "F $1").replace(/\s*\(([^)]*)\)\s*/, "($1) ").replace(/\s+/g, " ").trim();
const clean = (r) => r
  .replace(/\s*MRASS ?-?\s*Fog signal is radio activated[^.]*\.[^.]*\.[^.]*minutes\./g, "")
  .replace(/\s*Fog signal is radio activated[^.]*\.[^.]*\.[^.]*minutes\./g, "")
  .replace(/\.(?=[A-Z])/g, ". ").replace(/hours (?=[A-Z])/g, "hours. ").trim();
// Records where the PDF's columns run together, transcribed by hand from the list.
const FIX = {
  "point-judith": { structure: "Octagonal tower, lower half white, upper half brown.", remarks: "HORN: 1 blast ev 15s (2s bl)." },
  "bishop-and-clerks": { structure: "White and red cylindrical tower.", remarks: "" },
  "execution-rocks": { structure: "White stone tower, brown band midway of height; granite dwelling attached.", remarks: "" },
  "beavertail": { structure: "Square granite tower attached to white dwelling.", remarks: "Obscured from 175° to 215°. Lighted throughout 24 hours. HORN: 1 blast ev 30s (3s bl)." },
};
const seen = new Set();
const out = [];
for (const x of recs) {
  if (!/ Light$/.test(x.name) || /Light \d|Range|Buoy|Guide|Burlington|Directional/.test(x.name)) continue;
  if (!x.height || !(x.range >= 10) || seen.has(x.name) || SKIP[x.name]) continue;
  seen.add(x.name);
  const name = x.name.replace(/ Light$/, "").replace(/ And /, " and ");
  const lat = dms(x.pos[0]), lon = dms(x.pos[1]);
  const m = Math.round(x.height * 0.3048);
  out.push({
    id: name.toLowerCase().replace(/[()]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name, state: STATE(name, lat, lon), llnr: x.llnr, lat: +lat.toFixed(4), lon: +(-lon).toFixed(4),
    listed: x.char, char: `${tidy(x.char)} ${m}m ${x.range}M`, feet: x.height, range: x.range,
    structure: x.structure.replace(/\s+(\d+|[a-z])$/, ""), remarks: clean(x.remarks).replace(/\s*;\s*\.$/, "").replace(/\)$/, ").").replace(/\) Operates/, "). Operates"),
  });
  Object.assign(out[out.length - 1], FIX[out[out.length - 1].id] || {});
}
writeFileSync("src/light-list.json", JSON.stringify({ source: "US Coast Guard Light List, Volume I (Atlantic Coast, St. Croix River, Maine to Shrewsbury River, New Jersey), weekly edition", date, url: "https://navcen.uscg.gov/sites/default/files/pdf/lightLists/weeklyUpdates/v1d01WeeklyChanges.pdf", licence: "Public domain (work of the US government)", lights: out }, null, 1) + "\n");
console.log(out.length);
