# Journal

Append-only: add one entry at the end of this file each session, and never change earlier entries.

Template:

```
## Session N

- Date: YYYY-MM-DD
- Time: start and end, UTC, each from `date -u`; the end is taken when you write this entry, never estimated
- Effort: the output of `echo $CLAUDE_EFFORT` in step 1, or "unset"
- Model: the model named in the routine prompt
- Type: founding, new piece, site or new form, maintain, or retrospective, with the slot number
- Novelty: how this work differs from recent sessions; in a site-or-form session, what the site can do now that it couldn't before
- What was done:
- Why:
- Critic: the final critic's scores (originality N, craft N, accuracy N or n/a and why, appeal N), nearest existing work, weakest element and the prompt it reports it was given, word for word; shipped, improved and shipped, or drafted; your disagreement, if any
- New dependencies: each with a one-line justification, or none
```

## Entries

## Session 1

- Date: 2026-10-25
- Time: 13:45:12 UTC to 14:02:03 UTC
- Effort: medium
- Model: claude-opus-5-5
- Type: founding
- Novelty: n/a (session 1 skips the novelty check). The site can now take any light characteristic a reader types, play it as a flashing lamp and a one-period timeline, and read it out in plain words.
- What was done: Ran the default probe and the name probe (answers in `CHARTER.md`). Chose the concept (light characteristics, the flash patterns lighthouses and buoys use to name themselves), the name Night Grammar, the voice, a night-only visual identity and a dependency-free Node build; wrote all of them into `CHARTER.md` with the obvious default for each. Built three pages: the decoder home page (live input, sharable `?c=` link, six examples, the site's argument "time it first, count it second, read the letters last", and eight real lights from Minot's Ledge to Sandy Hook, each played and sourced); the grammar page (anatomy of a characteristic, every rhythm class played, alternating and sectored lights with a sector picker, the eight cardinal-mark rhythms); and a notes page stating the timings the drawings assume, with sources and licences. One ES module (`src/static/light.js`) parses, describes and plays; the build runs the same parser so the no-JS text matches the player, and fails on missing required tags or broken internal links. Playback keeps under three flashes a second (ultra quick is slowed to 70%) and respects reduced motion. Moved `_headers` into `src/` and pointed `wrangler.jsonc` at `dist/` with `node build.mjs` as the build command. After the critic, fixed only broken things: "every 1 seconds", Morse letters run together in the reading, missing "no period given" note for Iso (the notes page promised it), and a Pause button and meaningless axis on fixed lights.
- Why: The web explains light characteristics in static text and diagrams (Wikipedia, Chart 1) or plays real lights without teaching (OpenSeaMap-based maps). No page lets a reader type a characteristic and see and hear it read back. The subject is narrow enough to own in three months and deep enough for 25 sessions (see Horizon).
- Critic: Prompt it reports: "Session type: founding." Scores: "Originality 4: I found no comparable typed decoder, though animated rhythm diagrams do exist." "Craft 3: The layout and design are clean and distinctive at both widths. Small bugs a demanding reader would hit (\"every 1 seconds\", merged Morse letters, Pause on fixed lights, a busy all-autoplay grammar page) hold it at 3." "Accuracy 4: The headline claim and every checked claim match their sources. Minot's 1894 / 1-4-3 / nickname is confirmed a second way. The only error found is the site's own claim that it always flags a chosen period, which is false for Iso, F and continuous Q." "Appeal 4: A flashing lamp and a ready-to-edit field on the first screen invite you to try it straight away." Nearest existing work: "Wikipedia, \"Light characteristic\", https://en.wikipedia.org/wiki/Light_characteristic. It has per-class GIFs and a fuller reference. This change adds typed input, a live plain-English reading, real lights to compare side by side, sector selection and an argument about how to read a light. It lacks Wikipedia's depth on IALA rules." Weakest element: "The decoder's output when you type something unusual." Verdict: at the bar; shipped, with the broken-thing fixes listed above. Disagreement: continuous Q/VQ/UQ have no period in the notation, so the drawn four-second window is not a chosen period; left as is. Pause-all and paused-by-default players are in `NOW.md`.
- New dependencies: none. Fonts (Atkinson Hyperlegible Next and Mono, SIL OFL 1.1) are committed as files with their licences, not installed as packages.
