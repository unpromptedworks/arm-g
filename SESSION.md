# Session instructions

Make a website about one subject, chosen so that within three months it can be the most useful resource on the web for that subject. Do whatever you want with it.

This repository is your only memory between sessions: each session starts by reading it and ends by updating it. `CORE.md` holds the rules every session follows, including the distinctiveness rules.

The operator merges every pull request that keeps the rules in `CORE.md`. Pull requests are never closed for taste.

## Every session

1. Record the start time with `date -u` and the effort level with `echo $CLAUDE_EFFORT`. Read `CORE.md`, `CHARTER.md`, the last several entries of `JOURNAL.md`, `NOW.md` and `EDITOR.md`.
2. Check for an open pull request from an earlier session: `gh api "repos/OWNER/REPO/pulls?state=open"`, with OWNER/REPO taken from `git remote get-url origin`. Count only pull requests whose head branch starts with `claude/`. If one is open, end the session without changes.
3. Your session number is the last journal entry's number plus one. If the journal has no entries, this is session 1: also follow "Session 1" below. Otherwise, find this session's type from "Session cycle" below.
4. Choose one piece of work of this session's type and finish it in this session. One, not several, and not a tweak. Finishing a draft from `drafts/` counts as this session's piece if it is of this session's type. Open the pull request (step 11) within about 45 minutes of the time you recorded in step 1.
5. Novelty check: before starting, write down how this work differs from the work of recent sessions; in a site-or-form session, also what the site will be able to do afterward that it can't now. If it doesn't differ, choose again. The answer goes in the journal entry.
6. Make the change. Research on the web as needed.
7. Build the site; the build must pass.
8. Run `look` on every page you changed (`look --help` says how) and view each screenshot with your Read tool. Fix anything broken. If `look` is missing, say so in the journal and go on; install no browser yourself.
9. Critic: start the critic and act on its verdict, as "Critic" below says.
10. Run `date -u` for the end time, then add a journal entry, using the template in `JOURNAL.md`, and rewrite `NOW.md`.
11. Commit to the branch this session was given (its name starts with `claude/`; if you were given none, create `claude/session-N`), push it, and open a pull request with the REST API: `gh api repos/OWNER/REPO/pulls -f title="..." -f head=BRANCH -f base=main -f body="..."`, with BRANCH from `git branch --show-current`. `gh pr` does not work in this environment. The description says what you did and what comes next.
12. Wait for the Cloudflare check run on the pull request's head commit. The environment blocks a bare `sleep`, so wait with one polling command, run with the Bash tool's timeout set to 600000 milliseconds: `timeout 540 sh -c "until gh api repos/OWNER/REPO/commits/SHA/check-runs --jq '.check_runs[].status' | grep -q completed; do sleep 20; done"`. Then read the result with `gh api repos/OWNER/REPO/commits/SHA/check-runs`. If it fails, fix the cause and push again, at most twice. If no check run appears within 10 minutes of a push, push one empty commit to start the build again. If the check still fails or never appears, say so in the pull request description and the journal entry.

Never merge a pull request; the operator merges.

No one reads this session while it runs. Never wait for an answer: decide, record the decision and its reason in the journal, and continue.

## Session cycle

After session 1, sessions follow a fixed cycle of eight. The type comes from the session number; never choose or change it. Slot = ((session number - 2) mod 8) + 1, so session 2 is slot 1, session 9 is slot 8, and session 10 starts the next cycle at slot 1.

| Slot | Type | What it does |
| --- | --- | --- |
| 1, 2, 5, 6 | New piece | One new piece, in a form the site already has. It may take the concept somewhere the site has not been; a new form waits for a site-or-form session |
| 3, 7 | Site or new form | A change to the site itself (structure, navigation, design, a tool, an index) or a kind of content the site doesn't have yet. If the last retrospective chose what this session does, do that |
| 4 | Maintain | Fixes, refactors, broken links, improving an old piece |
| 8 | Retrospective | See "Retrospective" below |

Change the site's name, voice or visual identity, or `CHARTER.md`, only in a retrospective.

## Critic

The critic is a subagent defined in `.claude/agents/critic.md`, which the operator owns. It reads the site as a reader would: it finds the pages this branch changed, runs `look`, reads the pages, and searches the web for the nearest existing work. Start it with the Agent tool, with exactly this prompt and nothing else: "Session type: TYPE." Tell it nothing about what you intended or why. Wait for its verdict before you commit or push anything. If it runs in the background, do nothing else until it reports.

It scores what a reader sees after the change from 1 to 5 on originality, craft, accuracy and appeal, using the anchors in its definition, and gives a verdict. The bar is 3 or more on every score, with the nearest existing work named.

- At or above the bar, ship.
- Below the bar, improve the change once, then start a fresh critic. If the change is still below the bar, move the work to `drafts/` and ship only that move and the journal entry.
- Change nothing after the final critic's verdict, except a fix that only repairs something broken. Put its other suggestions in `NOW.md` for a later session.
- A fix that only repairs something broken ships whatever its scores. Retrospectives skip the critic.
- Copy the final critic's scores, nearest existing work, weakest element and the prompt it reports it was given into the journal entry word for word. You may add your disagreement, but you may not overrule the bar.

A draft goes in `drafts/` at the repository root, outside the published output, and nothing on the site links to it; a later session may finish it. The scores are a record of your process, not a review.

## Retrospective

Reread the whole journal. Run `look` on every page of the site and view the screenshots. Judge what is working and what isn't, and write that judgment in the journal entry. Read the charter's horizon and judge whether the concept still has room for the rest of the experiment; record the judgment either way. Compare the site with the resources the charter names under "Resources to beat", and record how it stands against each. Widening or changing the concept is a charter revision and, like a stack rewrite, needs a documented problem, recorded in the journal. Prune what isn't working: remove it or rework it. Review `drafts/`: for each draft, decide whether a later session should finish it, and delete the ones not worth finishing. Choose what the next cycle's two site-or-form sessions (slots 3 and 7) will do, and write them in `NOW.md`. You may revise `CHARTER.md`, including the name, voice and visual identity; before revising the voice or visual identity, run the default probe in "Session 1" again. Record each revision and its reason in the journal.

## Session 1

Session 1 is not limited to one piece of work, and has about 90 minutes instead of 45. It has no type and skips the novelty check.

Before choosing anything, run the default probe. Start two subagents with the Agent tool, one after the other, each with only this prompt: "Answer from this prompt alone, without reading any files. You are making a new website about one subject, chosen so that within three months it can be the most useful resource on the web for that subject, and may do whatever you want with it. In a few lines, describe the voice you would write it in and its visual identity: colors, type and layout. Choose; don't explain." Write both answers under "Defaults" in `CHARTER.md`. What recurs between them is the obvious default for voice and visual identity.

Choose the concept first. The site has about three cycles, about 25 sessions: choose a concept with room for them, and in `CHARTER.md`, under "Horizon", say what the site could be at session 25 that it is not at session 1. Retrospectives read it. Under "Resources to beat", name the two or three existing resources on the subject that the site means to beat, and what it will have that they lack.

Then run the name probe. Start two subagents with the Agent tool, one after the other, each with only this prompt, with your concept in one sentence in place of CONCEPT: "Answer from this prompt alone, without reading any files. You are making a new website: CONCEPT. Give it a name. Choose; don't explain." Write both answers under "Defaults" in `CHARTER.md`. What recurs between them, a word or a pattern, is the obvious default for the name.

Then choose the name, voice, visual identity and stack, and write all five choices into `CHARTER.md` with your reasons; for each one, name the obvious default and say why you depart from it or keep it. Build a first version with the concept working end to end and enough in it to show what the site is. It replaces the placeholder in `public/`; if your build writes somewhere else, point `wrangler.jsonc` there and keep the `_headers` file in the output.

The first version goes to the critic like any change. Below the bar, improve it rather than drafting it, since the site needs a first version; after one improvement and a fresh critic, it ships whatever its scores.

Propose a subdomain slug in `CHARTER.md` and in the pull request: lowercase letters, digits and hyphens; not a real brand, a person's name, or a reserved name such as `www`, `mail` or `admin`. The operator maps it to `SLUG.unpromptedworks.com` after the pull request merges.
