# reels_generator

Faceless news shorts for Instagram Reels, TikTok and YouTube Shorts, built with Claude + Remotion.

Ask Claude for a topic; it researches the story, writes the hook and script with the Hooksmith and viral-short-form skills, and renders a 1080×1920 video in the gold-and-cream motion-graphics style.

## Quick start

```bash
npm ci
scripts/render.sh StockShort stock-short     # renders out/stock-short.mp4 + a frame sheet
python3 scripts/sfx.py public/sfx-x.wav events.json   # sound effects for a new video
```

Open the editor with `npx remotion studio`.

## Layout

| Path | What |
| --- | --- |
| `CLAUDE.md` | Run rules every Claude session follows |
| `src/kit.tsx` | Design kit: colours, captions, cards, source line |
| `src/*Short.tsx` | One file per video (moving to a scene library + plans) |
| `public/` | Sound tracks and media used by renders |
| `scripts/` | `render.sh` (render + contact sheet), `sfx.py` (sound effects) |
| `examples/` | Approved videos to match for quality |
| `runs/` | One folder per video: plan, sources, log |
| `.claude/skills`, `.agents/skills`, `skills-lock.json` | Pinned skills: Remotion, Hooksmith, viral-short-form |
