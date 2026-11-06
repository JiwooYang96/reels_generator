# reels_generator: run rules

The user gives a topic; you return a finished vertical news short (MP4) with sources. You do the research, hook, script and scene choices by writing a **plan file**. The code renders it. Do not hand-code new video files; if no scene fits, see "New scenes" below.

## Setup (fresh session)

```bash
npm ci
```
Versions are pinned (Remotion 4.0.540, zod 4.6.7, skills in `skills-lock.json`). Don't upgrade unless the user asks.

## Topic -> video

1. **Research.** WebSearch the topic's latest news (last 24-48 h). Open at least 2 pages with WebFetch; a snippet is not a source. Pick one fresh, concrete number and a twist.
2. **Hook.** Use the `hooksmith` skill (`hooksmith generate`) for 3-5 hook options; score them with the `viral-short-form` skill's `assets/hook-checklist.md`. Don't reuse the hook family of the last entry in `runs/log.md`.
3. **Structure.** Pick one not used in the last 5 entries of `runs/log.md`: countdown, versus, myth vs fact, timeline, what-happens-next, single number, escalation -> rehook -> open loop. Spine: opening (number on screen within 1 s) -> escalation -> rehook ("But...") -> payoff -> open loop / follow CTA. Default 10 s total.
4. **Plan.** Write `plans/<id>.json` using scenes from `docs/SCENES.md` (see `plans/ai-selloff.json`). Scene 1 is an `open.*` opening (rotate the opening type). Captions: max 2 lines of 24 chars, one boxed keyword (`key: true`), `br: true` for line 2, about 2.5 words per second. Every data scene gets a `source` ("Outlet, date").
5. **Make.** `scripts/make.sh plans/<id>.json`. It checks the plan (fix every problem it prints), builds the sound, renders `out/<id>.mp4` and `out/<id>-sheet.png`. About 1 minute.
6. **Look.** Read `out/<id>-sheet.png`. Check that nothing overlaps or is cut off and that the story reads in order. Adjust the plan and re-run if needed.
7. **Deliver.** Send the MP4 with a one-line-per-scene summary, caveats (single-source numbers, illustrative chart shapes, numbers that will go stale) and source links. Append a row to `runs/log.md`. Commit the plan and log on a branch and open a PR when the repo is attached.

## Accuracy

- Every on-screen number comes from a page actually opened, and its scene shows the source.
- Say what a number is: "street price", "reported", "at Monday's close". `lineMove` shapes are illustrative and say so on screen.
- Politics: neutral wording, no realistic depictions of real politicians, no invented quotes. Outlet names as plain text, never logos.

## Variety

Brand stays fixed (`src/theme.ts`). Rotate structure, hook family, opening type and the main data scene; nothing repeats within the last 5 log entries.

## New scenes

If no scene fits, add one to `src/scenes/` following the existing pattern (zod schema + component + events + summary), register it in `src/scenes/registry.ts`, run `npx tsx scripts/catalog.ts`, test it in a plan under `tests/`, and tell the user. Port techniques from `vendor/rve-templates` (MIT) where useful.

## Remotion rules

All motion comes from `useCurrentFrame()` + `interpolate`/`spring`; CSS animations don't render. Use `random(seed)` from remotion, never `Math.random()`. No emoji (no emoji font in the cloud workspace). Keep key content inside x 90-950 px, y 180-1500 px (`SAFE` in `src/theme.ts`).
