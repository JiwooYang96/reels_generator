# reels_generator: run rules

The user gives a topic; you return a finished vertical news short (MP4) with sources. You do the research, hook, script and scene choices by writing a **plan file**. The code renders it. Do not hand-code new video files; if no scene fits, see "New scenes" below.

## Channel

- Account: **@fivebeforemonday** (`src/brand.ts`). Every scene shows the handle automatically; the last scene must be a follow CTA that names it (calendarCta's default CTA does). The plan check enforces this.
- **Balance numbers and information.** Numbers are the hook, explanations are the value. Alternate them: hook number → proof number → reasons (each a `causeChain` with a big `stat` and 2 short steps) → twist number → dated next event. At least 70% of scenes after the opening show a number, and any video of 5+ scenes explains at least once (`causeChain`, `headline` or `timeline`). The plan check enforces both.
- Channel palette: `broadsheet` (the default; newspaper paper texture, Instrument Serif headlines, highlighter keywords, navy dark scenes, colour accents). Plans leave `palette` out. **Read `docs/STYLE.md` before planning or adding a scene**: it is the house style (colour meanings, type sizes, motion, sources) and every video must match it. Typical length 20-26 s for a full story, 10 s for a single-number update.

## Setup (fresh session)

```bash
npm ci
```
Versions are pinned (Remotion 4.0.540, zod 4.6.7, skills in `skills-lock.json`). Don't upgrade unless the user asks.

## Topic -> video

1. **Research.** WebSearch the topic's latest news (last 24-48 h). Open at least 2 pages with WebFetch; a snippet is not a source. **Find the real story first**: search the company by name in plain words ("why <company> stock fell today") and go with the reason the coverage gives: earnings or guidance, a deal, an analyst call, a product, regulation, rates or data, occasionally people news. Don't assume a kind of story. Name the concrete event in the hook rather than an abstraction. Check the news hit the market in the window you're covering. Pick one fresh, concrete number and a twist.
2. **Hook.** Use the `hooksmith` skill (`hooksmith generate`) for 3-5 hook options; score them with the `viral-short-form` skill's `assets/hook-checklist.md`. Don't reuse the hook family of the last entry in `runs/log.md`.
3. **Structure.** Pick one not used in the last 5 entries of `runs/log.md`: countdown, versus, myth vs fact, timeline, what-happens-next, single number, escalation -> rehook -> open loop. Spine: opening (number on screen within 1 s) -> escalation -> rehook ("But...") -> payoff -> open loop / follow CTA. Default 10 s total.
   **Reasons must be reasons.** When the video promises "why" or "N reasons", each reason is a `causeChain` scene that states what caused what (cause → effect → effect on the stock), taken from the sources. A description of what happened ("down 25%", "fell 9%") is not a reason; put such numbers in the hook or a stat chip. Give every reason a `stat` (one big sourced number) and 2 short steps (about 5 words each) so it is readable in 3.5 s.
4. **Plan.** Write `plans/<id>.json` using scenes from `docs/SCENES.md` (see `plans/nvidia-week-nov6-broadsheet.json`). Leave `palette` at the channel default unless the user asks. Scene 1 is an `open.*` opening (rotate the opening type; `open.logo` for one-company stories). Add company logos per "Logos" below. Captions: max 2 lines of 24 chars, one boxed keyword (`key: true`), `br: true` for line 2, about 2.5 words per second. Every data scene gets a `source` ("Outlet, date").
5. **Make.** `scripts/make.sh plans/<id>.json`. It checks the plan (fix every problem it prints), builds the sound, renders `out/<id>.mp4` and `out/<id>-sheet.png`. About 1 minute.
6. **Look.** Read `out/<id>-sheet.png`. Check that nothing overlaps or is cut off and that the story reads in order. Adjust the plan and re-run if needed.
7. **Deliver.** Send the MP4 with a one-line-per-scene summary, caveats (single-source numbers, illustrative chart shapes, numbers that will go stale) and source links. Append a row to `runs/log.md`. Commit the plan and log on a branch and open a PR when the repo is attached.

## Daily reel (scheduled)

Every trading day after the New York close a scheduled task makes one reel about the day's hottest move:

1. Find the day's movers: search "stock market today" and the biggest big-tech movers, and confirm each
   closing move on Yahoo Finance or a major outlet.
2. Pick the move with the biggest story (not just the biggest %), research it as in step 1 above, then hook
   and plan as usual. Length 30-40 s (the check allows 28-45), in this order: hook -> what happened ->
   2-3 reasons (each sourced) -> what's next, with a date -> `endCard`. Write the plan to `plans/daily/<date>.json` (date = the New York trading
   day) and give it:
   - `voice` on each scene: the narrator's line, about 2.5-3 words per second of the scene (raise `seconds`
     if a line needs it). It carries the story; the caption stays the short on-screen version. Say numbers
     the way a newsreader would ("down eight point eight percent", "a hundred and ninety-two billion
     dollars"). See "Voice: hooking and trustworthy" below; the plan check enforces the limits.
   - `post.caption`: the Instagram caption. 2-3 lines, then "Get this week's five, free every Saturday ->
     link in bio.", 3-5 hashtags, a "Sources:" list, "Not investment advice." No links.
   - Last scene `endCard` (6 s, theme light, no caption) with `variant` by New York weekday: Mon/Thu `free`,
     Tue `free-alt`, Wed/Fri `paid`. Its `voice` is exactly `END_VOICE[variant]` from
     `src/scenes/endcard.tsx`. Never: "smash", "don't miss", "before it's too late", "guaranteed", made-up
     subscriber counts or deadlines.
3. `scripts/make.sh plans/daily/<date>.json` for a preview (it is silent here: the voice model runs on
   GitHub), read the sheet, fix until clean. GitHub refuses a plan that fails the check.
4. Commit the plan and the `runs/log.md` row straight to main and push. GitHub (`render-reel.yml`) then narrates it,
   mixes the sound, renders, and queues the reel in FiveBeforeMonday `reels/<date>.*`;
   `post-reel.yml` there posts it at 6:31pm New York time.
5. Wait for it: pull FiveBeforeMonday every minute for up to 20 minutes until `reels/<date>.mp4` appears,
   then send that MP4 and the caption to the user. If it doesn't appear, check the run
   (`gh run list -R JiwooYang96/reels_generator -w render-reel.yml`) and report what failed.
6. Write the day's note to FiveBeforeMonday `engine/data/daily/<date>.json` (format in that folder's README)
   and push it to main there, so the weekly issue leads with the right story.

## Sound

- **Narration** (`scripts/voice.py`): one clip per scene from its `voice` line, read by Kokoro (open-source,
  Apache-2.0, free, runs on GitHub's CPU; the engine VoiceStudio / OmniVoice Studio bundles). Voice
  `bm_george`, a calm British male newsreader; change it with the `VOICE_NAME` repo variable (`bm_lewis`,
  `bm_daniel`, `bf_emma`). `VOICE_ENGINE=omnivoice` switches to OmniVoice voice design (its official weights
  are non-commercial, so not for this channel as-is); `elevenlabs` uses the paid API if a key is set.
  Scenes stretch to fit their line. Local renders are silent previews.
- **Effects** (`scripts/sfxsynth.py`, our own, in `public/sfx/lib`): a news sting on the first frame, paper
  whooshes on cuts and one paper rip on the middle cut, boom + stamp on number reveals, typewriter ticks on
  counters, a falling tone on bad-news hooks, and a low news underscore that drops under the voice. Scenes
  trigger them through their events; nothing to do in the plan.

### Voice: hooking and trustworthy

- Line 1 is the hook, 9 words max, landing inside the opening: the concrete event and the number
  ("Apple just passed Nvidia." / "Microsoft lost two hundred billion today.").
- Then plain newsreader sentences: what happened, why (from the sources), what's next. No questions to the
  viewer, no "you", no "guys", no hype ("insane", "skyrocket", "to the moon", "must buy"; the check blocks
  these), no advice or predictions.
- Attribute anything that isn't a market price: "Reuters reports...", "according to the company".
- End on the dated next event and the follow line.

## Accuracy

- Every on-screen number comes from a page actually opened, and its scene shows the source.
- Say what a number is: "street price", "reported", "at Monday's close". `lineMove` shapes are illustrative and say so on screen.
- Sensitive stories (investigations, lawsuits, people news): only what outlets report, allegations attributed ("US officials suspect..."), no speculation or judgement, no images of the people involved.
- Politics: neutral wording, no realistic depictions of real politicians, no invented quotes. Outlet names as plain text, never logos.

## Logos

The channel covers stock news, and company logos are the hook. 472 logos (448 S&P 500 + popular extras) live in `public/logos/`, by ticker; `public/logos/manifest.json` lists them.

- **Where:** open with `open.logo` (`ticker`) when the story is about one company. Add `logo` (a ticker) to scoreboard rows, versus sides, barRank/compareBars bars, stampList rows, counter and priceSlam whenever a company is named. Up to 6 logos per scene.
- **Only the companies the story is actually about.** A logo identifies the company; never use one as decoration, for a company that is merely related, or to suggest a company endorses the channel.
- **Never alter a logo** (no recolouring, cropping, stretching, effects on the mark itself). The `Logo` component already places it on the right tile.
- **No logo for news outlets, politicians or parties.** Outlet names stay plain text.
- **Missing ticker?** `scripts/make.sh` fails with the fix. Run `python3 scripts/logos.py add TICKER` (fetches from nvstly/icons). If nvstly doesn't have it, drop the `logo` field; never draw or invent a logo.
- **Ticker != company name.** Use the share class people know (GOOGL for Alphabet, META, BRK.B has no logo). `logoName(ticker)` gives the company name from the manifest.

## Look

- No particle "glitter", sparkles or confetti: they read as AI-made. Impacts use the camera punch, shake and thin rings in `src/fx.tsx`.
- Palettes live in `src/theme.ts` (`broadsheet` default, plus `gold`, `terminal`, `editorial`, `midnight`); a plan picks one with `"palette"`. Big numbers and headlines spread `...HEAVY` (serif in broadsheet, heavy Inter otherwise) instead of `fontWeight: 900`. Fonts are bundled in `public/fonts` and loaded by `src/fonts.ts`; paper textures in `public/textures` come from Paper Shaders (Apache-2.0, `PaperStill` composition). Every colour in scenes comes from the palette tokens (`T`, `mix()`), never hard-coded, so palettes stay switchable. Logo tiles stay neutral white/black in every palette.

## Variety

Brand stays fixed (`src/theme.ts`, one palette for the channel). Rotate structure, hook family, opening type and the main data scene; nothing repeats within the last 5 log entries.

## New scenes

If no scene fits, add one to `src/scenes/` following the existing pattern (zod schema + component + events + summary), register it in `src/scenes/registry.ts`, run `npx tsx scripts/catalog.ts`, test it in a plan under `tests/`, and tell the user. Port techniques from `vendor/rve-templates` (MIT) where useful.

## Remotion rules

All motion comes from `useCurrentFrame()` + `interpolate`/`spring`; CSS animations don't render. Use `random(seed)` from remotion, never `Math.random()`. No emoji (no emoji font in the cloud workspace). Keep key content inside x 90-950 px, y 180-1500 px (`SAFE` in `src/theme.ts`).
