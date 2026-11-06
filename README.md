# reels_generator

Faceless news shorts for Instagram Reels, TikTok and YouTube Shorts, built with Claude + Remotion.

Give Claude a topic. It researches the story, writes the hook and script with the Hooksmith and viral-short-form skills, writes a short **plan** (which scenes, which numbers, which caption words), and one command renders a 1080×1920 video in the gold-and-cream style.

## Quick start

```bash
npm ci
scripts/make.sh plans/ai-selloff.json    # plan -> out/ai-selloff.mp4 + out/ai-selloff-sheet.png
npx remotion studio                      # live preview/editor
```

## How it fits together

| Path | What |
| --- | --- |
| `CLAUDE.md` | Run rules every Claude session follows (topic -> video) |
| `plans/` | One JSON plan per video |
| `docs/SCENES.md` | Catalogue of the 20 scene types and their fields (generated) |
| `src/scenes/` | Scenes: 6 openings (`open.*`) and 14 data scenes |
| `src/plan/` | Plan format, checks, caption timing, and the `PlanVideo` composition |
| `src/theme.ts` | Brand colours, fonts, safe zone |
| `src/fx.tsx` | Camera shake, particle burst, film grain, cut flash |
| `scripts/make.sh` | Check plan -> sound -> render -> frame sheet |
| `scripts/prepare.ts` | Plan checks (caption length, sources, keywords, reading speed) |
| `scripts/sfx.py` | Sound-effects track from scene events |
| `scripts/catalog.ts` | Regenerates `docs/SCENES.md` |
| `tests/` | Gallery plans that exercise every scene |
| `runs/log.md` | One row per published video (for rotation rules) |
| `public/logos/` | 472 company logos by ticker from nvstly/icons, with `manifest.json` and `NOTICE.md` |
| `scripts/logos.py` | Sync or add logos (`add TICKER`), pick each logo's tile colour |
| `data/sp500.csv` | S&P 500 constituents (ticker, name, sector) |
| `vendor/rve-templates/` | MIT template library by React Video Editor, kept as reference |

## Credits

Company logos come from [nvstly/icons](https://github.com/nvstly/icons) and are trademarks of their owners; see `public/logos/NOTICE.md`.

Some effects are ported from [Remotion Templates](https://github.com/reactvideoeditor/remotion-templates) by React Video Editor (MIT).
