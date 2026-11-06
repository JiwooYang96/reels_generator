# reels_generator: run rules

This repo turns a topic into a finished vertical news short. Claude does the research, hook, script and scene choices; the code here does the rest. Follow these rules every run.

## Setup (fresh session)

```bash
npm ci
```
Render with `scripts/render.sh <CompositionId> <name>` (it passes the pre-installed browser; Remotion's own browser download is blocked in the cloud workspace). Skills are pinned in `skills-lock.json`; do not upgrade them unless the user asks.

## Making a video from a topic

1. **Research.** WebSearch for the latest news on the topic (last 24-48 h). Open at least 2 pages with WebFetch; a snippet is not a source. Pick one fresh, concrete number and a twist. Save `runs/<YYYY-MM-DD>-<slug>/sources.md` (every number, URL, date).
2. **Hook.** Use the `hooksmith` skill to generate 3-5 hook systems; score them with `viral-short-form` `assets/hook-checklist.md`. Do not repeat the hook family of the previous entry in `runs/log.md`.
3. **Script spine.** Hook 0-2 s (a number on screen within 1 s) -> escalation -> rehook ("But...") -> payoff -> open loop / follow CTA. Default 10 s. About 2.5 caption words per second, max 2 lines, one boxed keyword per line.
4. **Opening.** Free route for now: a code-drawn opening (no Higgsfield). Unique per video.
5. **Scenes.** Reuse `src/kit.tsx` and existing scene patterns (see `examples/` and the `*Short.tsx` files). Add the composition to `src/Root.tsx` (30 fps, 1080x1920).
6. **Sound.** Write the event times to `runs/<run>/sfx.json` and run `python3 scripts/sfx.py public/sfx-<slug>.wav runs/<run>/sfx.json`.
7. **Render + QA.** `scripts/render.sh`, then look at `out/<name>-sheet.png`. Fix and re-render until: no badge/stamp covers a number or name; big numbers never wrap; key content inside x 80-920 px, y 180-1500 px; a source line in every data scene.
8. **Deliver.** Send the MP4 to the user with a short scene list, caveats and source links. Append a line to `runs/log.md`: date, topic, structure, hook family, opening, file.

## Accuracy

- Every on-screen number comes from a page actually opened, with a source line in its scene.
- Say what a number is: "street price", "reported", "at Monday's close". Label illustrative chart shapes on screen.
- Politics: neutral wording, no realistic depictions of real politicians, no invented quotes.

## Variety

Brand stays fixed (colours, fonts, caption style). Rotate story structure (countdown, versus, myth vs fact, timeline, what-happens-next, single number), hook family and opening; do not repeat any of them within the last 5 entries of `runs/log.md`.

## Remotion rules

All motion comes from `useCurrentFrame()` + `interpolate`/spring; CSS animations do not render. No emoji (no emoji font in the cloud workspace).
