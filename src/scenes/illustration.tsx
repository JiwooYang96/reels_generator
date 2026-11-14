// Illustration scenes: a drawing (scripts/illustrate.py, FLUX schnell on Cloudflare) cut out as torn magazine
// paper (scripts/tornpaper.py) is slapped onto the page, then drifts slowly. `src` is filled in by the pipeline;
// without it (local preview, no Cloudflare key) a blank torn sheet with the subject in pencil stands in.
import React from 'react';
import {Img, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {z} from 'zod';
import {Rings, punch, shakeAt} from '../fx';
import {pop} from '../kit';
import {Logo} from '../logo';
import {FONT, HEAVY, T, fit, mix, toneColor} from '../theme';
import type {SceneDef} from './types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const drawing = {
  // What to draw: a thing, place, scene or metaphor. Never a real person, face, name, logo or text.
  subject: z.string().min(8),
  style: z.enum(['pencil', 'riso', 'hatch']).default('pencil'),
  seed: z.union([z.string(), z.number()]).optional(),
  src: z.string().nullable().optional(), // set by the pipeline
};

// The torn sheet: falls onto the page with a small rotation and a paper slap, then drifts.
const Sheet: React.FC<{src?: string | null; subject: string; seed: string; top: number; size: number; at?: number}> = ({src, seed, top, size, at = 0}) => {
  const f = useCurrentFrame();
  if (!src) return null;
  const s = pop(f, at, 9);
  const tilt = (random(`tilt-${seed}`) - 0.5) * 6;
  const drift = interpolate(f, [at, at + 150], [0, 1], clamp);
  const rot = interpolate(s, [0, 1], [tilt * 3 - 8, tilt]) + drift * tilt * -0.3;
  const scale = interpolate(s, [0, 1], [1.25, 1]) * (1 + drift * 0.04);
  return (
    <div style={{position: 'absolute', left: (1080 - size) / 2, top: top + drift * -12, width: size, height: size, opacity: s, rotate: `${rot}deg`, scale: `${scale}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <Img src={staticFile(src as string)} style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.28))'}} />
    </div>
  );
};

const PullCard: React.FC<{theme: string}> = ({theme}) => {
  const f = useCurrentFrame();
  const s = pop(f, 0, 9);
  const dark = theme === 'dark';
  return (
    <div style={{position: 'absolute', left: 150, right: 150, top: 620, height: 520, opacity: s, rotate: `${interpolate(s, [0, 1], [-6, -1.5])}deg`, background: dark ? mix(T.paper, 0.08) : T.card, border: `3px solid ${dark ? mix(T.paper, 0.5) : T.ink}`, borderRadius: 10, boxShadow: '0 18px 40px rgba(0,0,0,0.22)',
      backgroundImage: `repeating-linear-gradient(135deg, ${mix(dark ? T.paper : T.ink, 0.07)} 0 2px, transparent 2px 14px)`}} />
  );
};

// ---------------------------------------------------------------- story beat
const illSchema = z.object(drawing);
export const illustration: SceneDef<z.infer<typeof illSchema>> = {
  schema: illSchema,
  defaultTheme: 'light',
  needsSource: false,
  summary: 'A hand-drawn illustration (colored pencil / riso / ink, made by the pipeline) torn out like a magazine clipping and slapped onto the page, then drifting. For the "why" beat or a weekend story beat. `subject` is a thing, place or metaphor, never a person, logo or text. Max 2 per weekday reel.',
  events: () => [{kind: 'impact', at: 4}],
  // Without a drawing (no key, or the free quota is used up) the beat still works: its number or words as a big
  // serif pull line on a torn card, so a reel never ships with a placeholder.
  Component: ({p, theme}) => p.src ? <Sheet src={p.src} subject={p.subject} seed={String(p.seed ?? p.subject)} top={430} size={900} /> : <PullCard theme={theme} />,
};

// ---------------------------------------------------------------- opening
const openIllSchema = z.object({
  ...drawing,
  big: z.string(),
  sub: z.string().optional(),
  tone: z.enum(['bad', 'good', 'gold']).default('bad'),
  ticker: z.string().regex(/^[A-Z.]{1,6}$/).optional(),
});
export const openIllustration: SceneDef<z.infer<typeof openIllSchema>> = {
  schema: openIllSchema,
  defaultTheme: 'dark',
  needsSource: false,
  summary: 'OPENING. A torn-paper illustration slaps onto the page with a shake (optional company logo pinned to its corner), then the big number lands under it. The magazine-cover hook.',
  events: (p) => [{kind: 'impact', at: 2}, {kind: 'impact', at: 14}, ...(p.tone === 'bad' ? [{kind: 'fall' as const, at: 0}] : [])],
  Component: ({p}) => {
    const f = useCurrentFrame();
    const at = 14;
    const sh = shakeAt(f, 2, 18, 10);
    const n = pop(f, at, 10);
    const c = toneColor(p.tone);
    const lg = pop(f, 8, 10);
    return (
      <div style={{position: 'absolute', inset: 0, translate: `${sh.x}px ${sh.y}px`, scale: `${punch(f, at)}`}}>
        <Sheet src={p.src} subject={p.subject} seed={String(p.seed ?? p.subject)} top={380} size={680} />
        {!p.src && p.ticker ? (
          <div style={{position: 'absolute', left: 340, top: 520, opacity: lg, scale: `${interpolate(lg, [0, 1], [1.4, 1])}`}}>
            <Logo ticker={p.ticker} size={400} />
          </div>
        ) : null}
        {p.src && p.ticker ? (
          <div style={{position: 'absolute', left: 740, top: 400, opacity: lg, rotate: `${interpolate(lg, [0, 1], [-30, 8])}deg`, scale: `${interpolate(lg, [0, 1], [1.6, 1])}`}}>
            <Logo ticker={p.ticker} size={130} />
          </div>
        ) : null}
        <Rings at={at} cx={540} cy={1170} color={c} from={120} to={520} />
        <div style={{position: 'absolute', left: 90, right: 130, top: 1060, textAlign: 'center', fontFamily: FONT}}>
          <div style={{fontSize: fit(p.big, 820, 210), ...HEAVY, letterSpacing: -6, color: c, scale: `${interpolate(n, [0, 1], [2.2, 1])}`, opacity: n, whiteSpace: 'nowrap'}}>{p.big}</div>
          {p.sub ? <div style={{fontSize: 44, fontWeight: 800, color: mix(T.paper, 0.95), marginTop: 6, opacity: interpolate(f, [at + 8, at + 16], [0, 1], clamp)}}>{p.sub}</div> : null}
        </div>
      </div>
    );
  },
};
