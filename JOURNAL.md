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

## Session 2

- Date: 2026-10-25
- Time: 16:23:03 UTC to 16:35:32 UTC
- Effort: medium
- Model: claude-opus-5-5
- Type: new piece, slot 1
- Novelty: Session 1 built the decoder, the grammar page and single example lights, each shown alone. This piece is the first to read a whole coast as a system: six neighbouring lights on outer Cape Cod played side by side, asking what tells each one from its neighbours. It is also the first to test the site's own rule ("time it first") against real lights and report where it fails (four of the six share a 10 s period).
- What was done: New page `cape-cod.html`, "Six lights, one coast, no two alike". It covers Highland, Chatham and Nauset, first told apart by one, two and three towers (the Three Sisters, 1837), and how those counts moved into flashes (the 1911 triple flash in homage to the Sisters, Nauset's three white flashes until 1981, then one white and one red). It plays the three Provincetown lights, where Race Point and Wood End share a rhythm and period and differ only in colour, and ends with a table of what separates each light from its neighbour. Added a "Cape Cod" nav item, a link from the home page's argument, a tower-count figure and a three-across player layout (CSS). Fixed a parser bug found while writing: an alternating light's period covers every colour (Wikipedia's table reads `Al WR 3s` as white 1.5 s, red 1.5 s), but the player drew one period per colour, so `Al.Fl WR 10s` ran 20 s. Each colour now gets an equal share of the period, and the reading says so. `Al WR 4s` with no rhythm now parses as alternating fixed. Added an Al row to the notes page's timings table. The first critic scored accuracy 2: Highland was called "the fastest of the six" (Long Point's 4 s is faster), and the page said the sources were silent on whether the three-count was deliberate, when the cited Three Sisters article says the 1911 triple flash was "in homage". I fixed both, replaced an empty closing line with the four-of-six-share-10 s finding, put the players three across and turned the sources into a list.
- Why: The concept's core rule, that neighbouring lights must differ, had no piece on the site. A real coast shows it better than any rule statement, and Cape Cod has a documented history of changing how it differs (towers, then flashes, then colour). The USCG Light List PDF could not be fetched (403 for the fetch tool; a download with a browser user agent was refused by the permission check as bot-check circumvention, and I did not try to work around it), so the characteristics are from each light's Wikipedia infobox, as for the session 1 lights.
- Critic: Prompt it reports: "Session type: new piece." First critic: originality 3, craft 3, accuracy 2, appeal 4; below the bar; improved once. Final critic: "Originality: 4. The Three Sisters \"one, two, three\" story and the characteristic data are each on the first page of a search. The synthesis is new: space-to-time, what tells each light from its neighbour, and the coast played side by side." "Craft: 4. It is clean and correct at both widths. The dot figure that hands off to three live players is a form worth studying. It is held back by the over-tidy chronology, the overstated \"red separates Nauset from Chatham\", a little stock phrasing and the cramped table on phones." "Accuracy: 4. The headline and the key claims match their sources and hold when checked a second way (Lighthouse Friends, NPS, Rowlett). It falls short of 5 because the framing leaves out a fact from a source the page itself cites (Race Point's 1816 rotating beacon), and the \"on purpose\" homage rests on Wikipedia and Lighthouse Friends while NPS says nothing about it." "Appeal: 3. The headline and the opening sentence make clear what this is and why it matters. On a phone the first screen is text only, and the lights only appear after scrolling." Nearest existing work: "https://www.ibiblio.org/lighthouse/macape.htm (Rowlett, \"Lighthouses of the United States: Cape Cod\"). It has every characteristic and the twin-tower and three-tower history in separate entries. It does not compare the lights or present them as a system. This page adds the comparison, the space-to-time argument and live players. It lacks Rowlett's breadth (fog signals, other Cape lights, current status)." Weakest element: "The two-era thesis (\"Before flashes, count the towers\") ignores the fact that Race Point used a revolving light to set itself apart in 1816, 21 years before the three towers." Verdict: at the bar; improved and shipped. Its suggestions are in `NOW.md`.
- New dependencies: none.
