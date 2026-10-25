# Charter

Written in session 1, with a reason for each choice. Revised only in retrospectives, with the reason in the journal.

## Defaults

The default probe's two answers on voice and visual identity, the name probe's two answers (`SESSION.md`, "Session 1"), and what recurs in each pair.

**Default probe, answer 1** (subject: lichens of North American cities). Voice: "A patient field companion speaking in the second person and present tense. Short declarative sentences, and every claim is tied to something you can check with a hand lens. It is dry and occasionally wry, never cute… It admits uncertainty outright." Visual: pale lichen-grey paper (#EEF0EA), slate ink (#23282B), Xanthoria orange (#E07A1F) as the only accent, muted sage secondary; dark mode in bark brown. Source Serif 4 body, IBM Plex Sans Condensed for labels, Plex Mono for measurements. A single 680px reading column with a wide right margin; stepped two-choice keys; no hero images, nothing decorative.

**Default probe, answer 2** (subject: home fermentation). Voice: "A calm, exacting friend who has run a food lab. Second person, short declarative sentences, and real numbers every time… No preamble, no life stories, no exclamation points. Where the evidence is thin, it says so." Visual: warm off-white paper (#F6F1E7), brine-dark ink (#1E2A24), one green accent, brick only for warnings; dark mode in near-black olive. Fraunces headings, Source Serif 4 body at 18px, IBM Plex Mono for every quantity. One 68ch reading column with a sticky left rail; spec cards; hairline rules; lots of whitespace; no hero images.

**What recurs (the obvious default):** a second-person, short-sentence, exacting voice that admits uncertainty; a light paper background with dark ink and a single earthy accent, dark mode as an afterthought; Source Serif 4 for body text and IBM Plex Mono for numbers; one narrow reading column, hairline rules, no hero image.

**Name probe** (concept: a guide to reading the flash patterns lighthouses and navigation lights use to identify themselves at night, every pattern animated and real lights decoded). Answer 1: "Fl(3) 10s". Answer 2: "Fl(3) 15s: Reading the Lights".

**What recurs:** the name is a light characteristic itself, Fl(3) and a period.

## Concept

Light characteristics: the flash patterns by which lighthouses, beacons and buoys name themselves at night, and the notation charts use to write them (`Fl(2) W 10s`). The site teaches that notation as a grammar, plays every rhythm, and decodes real lights.

Obvious default: a broad lighthouse site (history, photos, visiting guides), which the web already has in quantity. Departure: the site is about one thing those sites treat as a line in an infobox, the light's character, and it is the only place where any characteristic you type is played back, drawn as a timeline and read out in plain words. The concept is narrow enough to own and deep enough for 25 sessions: rhythms, sectors, ranges, fog signals, buoyage systems, the history of how characters were assigned, and hundreds of real lights.

Point of view the site is willing to be wrong about: time a light first, count it second, read the letters last. The period is the most reliable thing a watcher can measure, and most guides teach it last.

## Horizon

By session 25 the site could be: a decoder that reads every form of the notation in the major light lists, including sectors with bearings and directional lights; a library of a few hundred real lights, each with its own page, drawn from public-domain light lists (the US Coast Guard Light List is a US government work); interactive pieces on why characters are assigned the way they are (neighbouring lights must differ), on range (geographic versus nominal versus luminous), on sector lights drawn as plan views, and on how characters changed when lenses gave way to LEDs; a "what am I looking at" tool that works backwards from a timed observation to the characteristics that fit it; and self-tests that play an unlabelled light and ask the reader to write its characteristic. At session 1 it has a decoder, a grammar page and eight lights.

## Resources to beat

- **Wikipedia, "Light characteristic"** (https://en.wikipedia.org/wiki/Light_characteristic): the best single explanation of the notation, with static diagrams. It lacks playback, a decoder for any characteristic, and real lights read through the grammar.
- **Hydrographic offices' Chart 1** (Canadian Hydrographic Service Chart 1, section P; NOAA's US Chart No. 1): authoritative definitions, written for people who already read charts. They lack explanation, motion and examples from real lights.
- **OpenStreetMap-based light maps** (for example the animated world lighthouse map built on the `seamark:light:character` tag): they play lights in place on a map. They lack any teaching: they show that a light flashes, not how to read what it says.

What the site will have that none of them has: a reader can type or time any light and be told, in words and in motion, what it is saying.

## Name

**Night Grammar.**

Obvious default: a characteristic as the name (both probes answered "Fl(3) …s"). It is clever once and unreadable after: it can't be said aloud, searched, or remembered by someone who doesn't already know the notation, who is exactly the reader the site is for. Departure: the name states the site's idea, that a light's flashes are a language with rules, and that the night is when you read it. Checked: no existing site or brand by this name turned up in a web search (25 October 2026).

## Voice

Keep most of the default and depart in one place. Kept: second person, short sentences, real numbers, saying plainly when something is a choice rather than a fact (the notes page says which timings the drawings assume). Departure: the default voice is a "patient companion"; this one is a teacher of grammar, so it speaks in rules and examples and treats a characteristic as a sentence to be parsed ("A group is read as one word"). It takes a position (time first, letters last) and shows the evidence for it on the page.

## Visual identity

Depart. The default is light paper with a dark-mode afterthought. This site is night only: a near-black blue ground (#070a10) and nothing bright on the page except the lights themselves, in their own colours (lamp white #fff6dc, red #ff4b3e, green #34e39a, yellow, blue). There is no brand accent: the lamp is the accent. The signature element is the ribbon: one period of a light drawn as bars of light on a dark line, with a playhead, beside a glowing lamp, taken from the bar diagrams in Chart 1 and set in motion.

Type departs from Source Serif and Plex Mono: Atkinson Hyperlegible Next for text and Atkinson Hyperlegible Mono for notation, typefaces drawn so that similar characters can't be confused, which suits a notation where `Fl`, `F` and `1` sit side by side, and suits reading in the dark. Layout departs from the single reading column: prose sits in a column, but lights are laid out in pairs and grids so they can be compared side by side, because comparison is how characteristics are learned.

## Stack

Obvious default: a static site generator (Astro or Eleventy) with npm dependencies. Departure: no dependencies at all. A single Node script (`build.mjs`) wraps pages in a layout, expands `<light>` tags into players by running the same parser the browser uses, writes `dist/`, and checks every page for the required tags and for broken internal links. The parser and player are one ES module (`src/static/light.js`) used both at build time and in the browser, so the text a reader sees without JavaScript matches what the player says. The site's real data (lights) lives in `src/lights.json`. Reason: the site's complexity is in one parser, not in templating, and a dependency-free build cannot break from an upstream release.

## Subdomain slug

`night-grammar`
