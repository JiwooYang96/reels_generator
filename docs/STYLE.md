# House style: Broadsheet

The look of every @fivebeforemonday reel. It is the `broadsheet` palette in `src/theme.ts` and the default for
every plan, so following the plan rules gets you this look for free. This page records *why* it looks the way it
does, so new scenes and new videos stay in the same world. Approved sample: `plans/nvidia-week-nov6-broadsheet.json`.

## The idea in one line

**A printed financial newspaper that moves.** Trustworthy like a broadsheet front page, loud enough to stop a thumb:
paper, ink and serif headlines carry the trust, while colour, highlighter swipes and big numbers carry the hook.

Readable beats pretty. If a choice makes the screen harder to read in 2 seconds on a phone, it's wrong.

## Colour (meaning first, never decoration)

| Token | Hex | Used for |
|---|---|---|
| paper (`cream`) | `#f1ead9` | Light scenes: real paper texture behind everything |
| navy (`dark`) | `#14233b` | Dark scenes: openings and the closing CTA. Paper fibres show through |
| ink | `#16130f` | All text and rules on paper |
| red | `#c8372d` | Falls, losses, warnings; the keyword swipe on navy; stamps |
| green | `#1f8a57` | Gains |
| cobalt (`gold`) | `#1d4f91` | Neutral figures, chart bars, links |
| highlighter (`goldLight`) | `#ffd23f` | The ONE thing to notice: caption keyword on paper, hero bar, date tabs |

Rules: one highlighter per screen. Red/green only for direction. Never hard-code a hex in a scene; read `T`.

## Type

- **Headlines and big numbers: Instrument Serif** (condensed Didone-style serif, 400). Scenes spread `...HEAVY`.
  Big numbers are big: 160-230 px. The keyword in a caption is set in italic.
- **Labels, chips, small text: Source Sans 3** (600/700). Uppercase with letter-spacing for kickers and sources.
- **Body: Source Serif 4** when a scene needs a sentence.
- Minimum sizes: captions 96 px, labels 40 px, nothing under 28 px (the source line is the only 28-30 px text).
- Fonts are bundled in `public/fonts` and loaded by `src/fonts.ts`. Quote family names in CSS (`"Source Sans 3"`).

## Surfaces

- Light scenes sit on a real paper still (`public/textures/paper-*.png`, rendered from Paper Shaders, Apache-2.0,
  by the `PaperStill` composition). The texture drifts a few pixels; a soft vignette darkens the edges.
- Dark scenes are navy with the same paper fibres blended in (soft-light), so the whole video feels printed.
- Cards are newspaper panels: square corners (4 px), hairline ink border, **double rule on top**, soft drop shadow.
- Film grain over everything (`grain: true`, the default).
- Use found, open-licensed textures. Don't draw your own.

## Motion

- Words land one by one (fade + small rise + de-blur). The keyword's highlighter swipes left to right as it lands.
- Numbers hit with a camera punch and a short shake; stamps scale down from 1.5x with a blur.
- Cuts get a 2-frame white flash. A paper rip (`BroadsheetSample`'s `PaperRip`) is the special transition:
  at most once per video, on the biggest turn of the story ("But...").
- No particles, sparkles or confetti. Everything is driven by `useCurrentFrame()`.

## Sound

- A warm, clear US female newsreader voice (Kokoro `af_heart`) reads one plain sentence per scene. The voice tells the
  story; captions show the short version. Hook in the first line, then facts with attribution. No hype words,
  no shouting, no advice.
- Newsroom effects from our library: sting at the open, paper whoosh on cuts, one paper rip, boom + stamp on
  the big number, typewriter ticks on counters. The underscore sits low under the voice.

## Layout

- Content stays inside x 90-950, y 180-1500 (`SAFE`). Caption at the top, the visual in the middle, handle and
  source line at y 1386-1440.
- One idea per screen. If a screen needs a paragraph to make sense, split it into two scenes.

## Sources on screen

Keep the small source line on data scenes ("Source: Outlet, date"). It is the cheapest trust signal a finance
reel has, it protects the account when a number is questioned, and at 30 px in muted ink it doesn't compete with
the hook. Don't enlarge it, and don't put it on the opening or the CTA.

## Story (what makes it enticing)

- Lead with the **real** story: the reason the coverage actually gives for the move (earnings, guidance, a deal,
  an analyst call, regulation, data; rarely people news). Name the concrete event in the hook, then show the
  number it moved.
- Number on screen within 1 second. Escalate, then rehook with "But...", then pay off, then a dated next event.
- Sensitive stories: report what outlets report, attribute allegations, no speculation, no realistic depictions
  of real people (logos only for companies).

## End card (every daily reel)

The last 6 s promote the newsletter, calmly: logo lockup, one specific benefit line, the highlighted
"Free every Saturday" (or the founding price on paid days), the red url pill and "LINK IN BIO". No caption
on top, no hype, no fake urgency. Copy lives in `END_COPY`/`END_VOICE` in `src/scenes/endcard.tsx`;
change it there, not in plans. Variants: `free` (default), `free-alt` (A/B test), `paid` (Wed/Fri).

## Checklist before delivering

1. Read `out/<id>-sheet.png`: nothing overlaps, nothing cut off, every caption readable at phone size.
2. One highlighter per screen, red/green match the direction of each move.
3. Every number has its source on that scene.

## Illustrations (scripts/illustrate.py + scripts/tornpaper.py)

Drawn by FLUX.1 [schnell] on Cloudflare Workers AI (free tier), then cut out as torn magazine paper with a pale
fibrous rim and a soft shadow. House style `pencil`: colored pencil over loose ink cross-hatching in navy, brick
red, mustard and cream. `riso` (two-colour risograph, bolder) for special editions; `hatch` (newspaper engraving)
for history. Styles were picked by trial in `lab/` (Nov 15).

- Subjects are things, places, scenes and metaphors (an empty chair, toppling coins, a paper boat in a storm).
  Never real people, faces, names or logos (the check refuses them); portraits come only from the user.
- Avoid subjects with signs, screens or labels: the model invents text on them. Say what you want, never "no X".
- Weekday reels: 1-2 illustrations (opening, maybe the "why"). Weekend specials: 3-5, one per story beat.
- Numbers and charts stay in our scenes; an illustration never carries data.
