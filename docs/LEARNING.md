# Learning from our reels

Every reel is graded on its real Instagram numbers, and what we learn changes the next reel. The loop is automatic:

```
post-reel.yml (FBM)        posts the reel; reels/<key>.json keeps "meta": hook, scores, scenes, timeline
reel-stats.yml (FBM)       12:17 UTC daily: Instagram insights per reel -> engine/data/reel-stats.json
reel-learnings.yml (here)  12:47 UTC daily: scripts/reelanalyze.py -> docs/LEARNINGS.md, data/learnings.json, data/report.json
daily reel task            reads docs/LEARNINGS.md before writing; reelscore.py prints LEARNED warnings
weekly review (Monday)     dashboard + asks the user for retention-graph screenshots
```

## What each number tells us

| Number | From | Grades |
| --- | --- | --- |
| 3-second hold = 100 - `reels_skip_rate` | API | the hook (first frame, cover, line 1) |
| average watch time / length | API | the middle; the scene playing at that second is where the typical viewer left |
| shares / reach, saves / reach | API | whether it was worth sending or keeping (the strongest signals) |
| outlier = views / our median | API | reach compared with our own normal, not other accounts |
| retention graph drops | app screenshot | the exact second people left, mapped to the scene |

Score 0-100 = percentile among our settled reels (48 h+): hold 30%, watch 30%, shares 20%, saves 10%, outlier 10%.
Diagnosis: low hold = **hook problem**; good hold, low watch = **middle problem** (names the scene); watched but not
shared = **weak payoff**; held but low reach = **distribution**, not the hook (ig-audit's distinction).

A pattern (hook family, opening, structure, music, drawings, length, daily vs special) becomes a rule only with 8+
settled reels, 3+ on each side and a 15-point gap; it says its sample size and confidence. Until then we rotate.

## Retention screenshots

The per-second graph is only in the app. The weekly review names the reels it wants (best 2, worst 2). Read each
screenshot as (second, % still watching) points and save them:

```
python3 scripts/reelanalyze.py retention <reel-key> 0:100 1:68 3:52 6:44 10:38 20:30 30:22
```

`<reel-key>` is the FBM file name (`2026-11-14b`, `special-2026-11-15-wayne`). Read points at every visible bend,
at least 0, 1, 3 s and every 5 s after; estimate from the gridlines and say so. Push to main: the learnings rerun.

## A/B tests with trial reels

Trial reels go to non-followers first; with `"trial": "auto"` Instagram shares the better one with followers
(`graduation_strategy: SS_PERFORMANCE`). Use them to test one thing at a time, usually the hook:

- At most 2 tests a week, on a strong story. Pick the test from "Next experiments" in docs/LEARNINGS.md.
- Two plans: `plans/daily/<date>a.json` and `<date>b.json`, identical except what is tested (scene 1 voice +
  caption, or the opening type). Both pass reelscore 85+/85+. Both get
  `"ab": {"group": "<date>-<topic>", "variant": "A" | "B", "testing": "hook family X vs Y"}` and
  `"post": {"caption": ..., "trial": "auto"}`.
- Push them as **two separate commits and pushes** (render-reel.yml renders one plan per push); both queue and post
  together at 6:31pm. That day there is no separate normal reel.
- **Only with trial reels.** Never post two near-identical public reels: on Nov 15 the Netflix A/B pair went out as
  normal reels (trial refused) and each reached 2 accounts, against 40-115 for our other reels, consistent with
  Instagram treating them as duplicates. Until the account has trial reels (about 1,000 followers), test one idea
  per day across different stories instead (the analyser compares them), never two copies of one story.
- The analyser reports the winner by 3-second hold (then watch time). A clear win is 5+ points.
