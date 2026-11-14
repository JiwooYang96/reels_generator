// Free, code-drawn openings (the first ~2 s). Each is seeded by the plan's text,
// so the same type looks different in every video. Higgsfield can replace these later.
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {z} from 'zod';
import {Rings, punch, shakeAt} from '../fx';
import {pop} from '../kit';
import {Logo, logoName} from '../logo';
import {FONT, HEAVY, T, fit, mix, toneColor} from '../theme';
import type {SceneDef} from './types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const base = z.object({big: z.string(), sub: z.string().optional(), tone: z.enum(['bad', 'good', 'gold']).default('bad')});
type Base = z.infer<typeof base>;
// The big number lands inside half a second: the hook is read before it is heard.
const hitAt = (dur: number) => Math.min(14, Math.max(8, Math.round(dur * 0.32)));

const BigText: React.FC<{p: Base; at: number; y?: number}> = ({p, at, y = 880}) => {
  const f = useCurrentFrame();
  const c = toneColor(p.tone);
  const s = pop(f, at, 10);
  return (
    <div style={{position: 'absolute', left: 90, right: 130, top: y, textAlign: 'center', fontFamily: FONT}}>
      <div style={{fontSize: fit(p.big, 820, 230), ...HEAVY, letterSpacing: -8, color: c, scale: `${interpolate(s, [0, 1], [2.4, 1])}`, opacity: s, textShadow: `0 0 60px ${c}66`, whiteSpace: 'nowrap'}}>{p.big}</div>
      {p.sub ? <div style={{fontSize: 46, fontWeight: 800, color: T.paper, marginTop: 10, opacity: interpolate(f, [at + 8, at + 16], [0, 1], clamp)}}>{p.sub}</div> : null}
    </div>
  );
};

const Glow: React.FC<{color: string; at: number}> = ({color, at}) => {
  const f = useCurrentFrame();
  return <div style={{position: 'absolute', left: 40, top: 500, width: 1000, height: 1000, borderRadius: '50%', background: `radial-gradient(circle, ${color}55 0%, ${color}00 65%)`, opacity: interpolate(f, [at - 4, at + 6], [0, 1], clamp)}} />;
};

// ---------------------------------------------------------------- burst
export const openBurst: SceneDef<Base> = {
  schema: base,
  defaultTheme: 'dark',
  needsSource: false,
  summary: 'OPENING. Big number/word slams in with a camera punch, shake and impact rings. Shock stats.',
  events: (p, dur) => [{kind: 'impact', at: hitAt(dur)}, ...(p.tone === 'bad' ? [{kind: 'fall' as const, at: 0}] : [])],
  Component: ({p, dur}) => {
    const f = useCurrentFrame();
    const at = hitAt(dur);
    const s = shakeAt(f, at, 26, 14);
    const c = toneColor(p.tone);
    return (
      <AbsoluteFill style={{translate: `${s.x}px ${s.y}px`, scale: `${punch(f, at)}`}}>
        <Glow color={c} at={at} />
        <Rings at={at} cx={520} cy={990} color={c} />
        <BigText p={p} at={at} />
      </AbsoluteFill>
    );
  },
};

// ---------------------------------------------------------------- ticker crash
const tickerSchema = base.extend({tickers: z.array(z.object({s: z.string(), v: z.string()})).min(3).max(12)});
export const openTicker: SceneDef<z.infer<typeof tickerSchema>> = {
  schema: tickerSchema,
  defaultTheme: 'dark',
  needsSource: false,
  summary: 'OPENING. Three rows of scrolling ticker tape, then a crash (or surge) line slashes across and the big text slams. Market moves.',
  events: (_p, dur) => [{kind: 'ticks', at: 0, end: hitAt(dur)}, {kind: 'impact', at: hitAt(dur)}],
  Component: ({p, dur}) => {
    const f = useCurrentFrame();
    const at = hitAt(dur);
    const c = toneColor(p.tone);
    const down = p.tone !== 'good';
    const slash = interpolate(f, [at - 8, at], [0, 1], clamp);
    const dim = interpolate(f, [at, at + 6], [1, 0.25], clamp);
    return (
      <AbsoluteFill>
        {[0, 1, 2].map((row) => {
          const speed = 9 + row * 4;
          const items = [...p.tickers, ...p.tickers, ...p.tickers];
          return (
            <div key={row} style={{position: 'absolute', top: 620 + row * 150, left: 0, whiteSpace: 'nowrap', translate: `${-f * speed - row * 200}px 0px`, opacity: dim, fontFamily: FONT, fontSize: 64, fontWeight: 800, letterSpacing: 1}}>
              {items.map((t, i) => {
                const neg = t.v.trim().startsWith('-') || t.v.trim().startsWith('−');
                return (
                  <span key={i} style={{marginRight: 60}}>
                    <span style={{color: T.paper}}>{t.s} </span>
                    <span style={{color: neg ? T.red : T.green}}>{neg ? '▼' : '▲'}{t.v.replace(/^[-−+]/, '')}</span>
                  </span>
                );
              })}
            </div>
          );
        })}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <line x1={-40} y1={down ? 560 : 1150} x2={-40 + 1160 * slash} y2={(down ? 560 : 1150) + (down ? 590 : -590) * slash} stroke={c} strokeWidth={22} strokeLinecap="round" style={{filter: `drop-shadow(0 0 24px ${c})`}} />
        </svg>
        <Glow color={c} at={at} />
        <BigText p={p} at={at} y={1020} />
      </AbsoluteFill>
    );
  },
};

// ---------------------------------------------------------------- spotlight
export const openSpotlight: SceneDef<Base> = {
  schema: base,
  defaultTheme: 'dark',
  needsSource: false,
  summary: 'OPENING. A spotlight sweeps across a dark stage and lands on the big text. Reveals, "the number nobody is talking about".',
  events: (_p, dur) => [{kind: 'impact', at: hitAt(dur) + 4}],
  Component: ({p, dur}) => {
    const f = useCurrentFrame();
    const at = hitAt(dur);
    const x = interpolate(f, [0, at], [-200, 540], {...clamp, easing: (t) => 1 - (1 - t) ** 3});
    const r = interpolate(f, [at, at + 10], [300, 520], clamp);
    return (
      <AbsoluteFill>
        <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle ${r}px at ${x}px 1000px, ${mix(T.goldLight, 0.22)}, ${mix(T.dark, 0)} 70%)`}} />
        <div style={{position: 'absolute', left: x - 6, top: 0, width: 12, height: 760, background: `linear-gradient(180deg, ${mix(T.goldLight, 0)}, ${mix(T.goldLight, 0.35)})`, filter: 'blur(14px)'}} />
        <div style={{position: 'absolute', inset: 0, WebkitMaskImage: `radial-gradient(circle ${r}px at ${x}px 1000px, #000 55%, transparent 75%)`}}>
          <BigText p={p} at={at - 6} y={890} />
        </div>
      </AbsoluteFill>
    );
  },
};

// ---------------------------------------------------------------- cash rain
export const openCashRain: SceneDef<Base> = {
  schema: base,
  defaultTheme: 'dark',
  needsSource: false,
  summary: 'OPENING. Banknotes rain down (they burn red for bad news) behind the big text. Money lost, money made, prices.',
  events: (p, dur) => [{kind: 'impact', at: hitAt(dur)}, ...(p.tone === 'bad' ? [{kind: 'fall' as const, at: 0}] : [])],
  Component: ({p, dur}) => {
    const f = useCurrentFrame();
    const at = hitAt(dur);
    const bad = p.tone === 'bad';
    return (
      <AbsoluteFill>
        {Array.from({length: 34}).map((_, i) => {
          const r = random(`${p.big}-cash-${i}`);
          const r2 = random(`${p.big}-cash2-${i}`);
          const x = r * 1080 - 70;
          const y = -200 + ((f * (14 + r2 * 16) + r2 * 2200) % 2300);
          const burn = bad ? interpolate(f, [at, at + 20], [0, 1], clamp) * (r > 0.4 ? 1 : 0) : 0;
          return (
            <div key={i} style={{position: 'absolute', left: x, top: y, width: 150, height: 70, rotate: `${(r - 0.5) * 120 + f * (r2 - 0.5) * 6}deg`, borderRadius: 8, background: burn > 0 ? `linear-gradient(90deg, #3f6b45 ${100 - burn * 100}%, ${T.red} ${100 - burn * 100}%, #1a0d0b)` : '#3f6b45', border: '3px solid #a8c79a', opacity: 0.55 + r2 * 0.35 - burn * 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d8ead0', fontFamily: FONT, ...HEAVY, fontSize: 36}}>
              $
            </div>
          );
        })}
        <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 52%, ${mix(T.dark, 0.85)} 0%, ${mix(T.dark, 0)} 60%)`}} />
        {/* keep the caption zone readable */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 520, background: `linear-gradient(180deg, ${mix(T.dark, 0.97)} 0%, ${mix(T.dark, 0.92)} 70%, ${mix(T.dark, 0)} 100%)`}} />
        <Glow color={toneColor(p.tone)} at={at} />
        <BigText p={p} at={at} />
      </AbsoluteFill>
    );
  },
};

// ---------------------------------------------------------------- breaking
export const openBreaking: SceneDef<Base & {label: string}> = {
  schema: base.extend({label: z.string().default('BREAKING')}),
  defaultTheme: 'dark',
  needsSource: false,
  summary: 'OPENING. A red band ("BREAKING" or custom label) wipes in, then the big text glitches in with an RGB split. Fresh news.',
  events: (_p, dur) => [{kind: 'click', at: 2}, {kind: 'impact', at: hitAt(dur)}],
  Component: ({p, dur}) => {
    const f = useCurrentFrame();
    const at = hitAt(dur);
    const band = interpolate(f, [0, 8], [0, 1], {...clamp, easing: (t) => 1 - (1 - t) ** 3});
    const glitch = f >= at && f < at + 8 ? (random(`gl-${f}`) - 0.5) * 30 : 0;
    const c = toneColor(p.tone);
    return (
      <AbsoluteFill>
        <div style={{position: 'absolute', left: 0, top: 640, height: 120, width: `${band * 100}%`, background: T.red, display: 'flex', alignItems: 'center', paddingLeft: 120, boxSizing: 'border-box', fontFamily: FONT, fontSize: 64, ...HEAVY, letterSpacing: 10, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden'}}>
          {p.label}
        </div>
        {f >= at ? (
          <div style={{translate: `${glitch}px 0px`, filter: f < at + 8 ? 'drop-shadow(8px 0 0 #ff0040) drop-shadow(-8px 0 0 #00e5ff)' : 'none'}}>
            <BigText p={p} at={at} y={900} />
          </div>
        ) : null}
        <div style={{position: 'absolute', left: 120, right: 130, top: 1290, height: 6, background: c, scale: `${interpolate(f, [at, at + 10], [0, 1], clamp)} 1`, transformOrigin: 'left'}} />
      </AbsoluteFill>
    );
  },
};

// ---------------------------------------------------------------- logo
// The company's logo slams in with its move. Use when the story is about one company.
const logoOpenSchema = base.extend({ticker: z.string().regex(/^[A-Z.]{1,6}$/, 'ticker like NVDA')});
export const openLogo: SceneDef<z.infer<typeof logoOpenSchema>> = {
  schema: logoOpenSchema,
  defaultTheme: 'dark',
  needsSource: false,
  summary: 'OPENING. The company logo (by ticker) drops in with a punch-in and impact ring, ticker and name under it, then the big move (e.g. "−4.2%"). One-company stories.',
  events: (p, dur) => [{kind: 'impact', at: 6}, {kind: 'impact', at: hitAt(dur) + 6}, ...(p.tone === 'bad' ? [{kind: 'fall' as const, at: 4}] : [])],
  Component: ({p, dur}) => {
    const f = useCurrentFrame();
    const at = hitAt(dur) + 6;
    const drop = pop(f, 0, 12);
    const s = shakeAt(f, 6, 18, 12);
    const s2 = shakeAt(f, at, 22, 12);
    const c = toneColor(p.tone);
    return (
      <AbsoluteFill style={{translate: `${s.x + s2.x}px ${s.y + s2.y}px`, scale: `${punch(f, 6) * punch(f, at)}`}}>
        <Glow color={c} at={at} />
        <Rings at={6} cx={540} cy={760} color={mix(T.paper, 0.7)} from={210} to={420} />
        <Rings at={at} cx={540} cy={1180} color={c} from={120} to={560} />
        <div style={{position: 'absolute', left: 340, top: 560, translate: `0px ${interpolate(drop, [0, 1], [-260, 0])}px`, scale: `${interpolate(drop, [0, 1], [1.4, 1])}`, opacity: drop}}>
          <Logo ticker={p.ticker} size={400} />
        </div>
        <div style={{position: 'absolute', left: 90, right: 130, top: 990, textAlign: 'center', fontFamily: FONT, color: `${mix(T.paper, 0.7)}`, fontSize: 40, fontWeight: 800, letterSpacing: 6, opacity: interpolate(f, [8, 14], [0, 1], clamp)}}>
          {p.ticker} · {logoName(p.ticker).toUpperCase()}
        </div>
        <BigText p={p} at={at} y={1030} />
      </AbsoluteFill>
    );
  },
};

// ---------------------------------------------------------------- chair
// An empty executive chair behind the desk, the company's logo on the desk and a nameplate that tips over:
// a leader is gone, said without showing any person. Use for CEO exits and leadership stories.
const chairSchema = base.extend({
  ticker: z.string().regex(/^[A-Z.]{1,6}$/, 'ticker like NVDA'),
  plate: z.string().max(10).default('CEO'),
});
export const openChair: SceneDef<z.infer<typeof chairSchema>> = {
  schema: chairSchema,
  defaultTheme: 'dark',
  needsSource: false,
  summary: 'OPENING. An empty executive chair still swaying behind a desk with the company logo; the CEO nameplate tips over and the big number slams in. Leadership exits, without showing any person.',
  events: (p, dur) => [{kind: 'impact', at: hitAt(dur)}, ...(p.tone === 'bad' ? [{kind: 'fall' as const, at: 2}] : [])],
  Component: ({p, dur}) => {
    const f = useCurrentFrame();
    const at = hitAt(dur);
    const s = shakeAt(f, at, 22, 12);
    // The chair is still turning a little, as if someone just got up: a decaying swivel.
    const swivel = Math.sin(f / 7) * 5 * Math.exp(-f / 40);
    const roll = interpolate(f, [0, 40], [0, -14], clamp);
    const desk = pop(f, 0, 10);
    const logo = pop(f, 4, 10);
    const tip = interpolate(f, [at - 2, at + 6], [0, 1], {...clamp});
    const ink = mix(T.paper, 0.9);
    return (
      <AbsoluteFill style={{translate: `${s.x}px ${s.y}px`, scale: `${punch(f, at)}`}}>
        <Glow color={toneColor(p.tone)} at={at} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform="translate(0 70)">
          <g transform={`translate(540 ${770 + roll}) rotate(${swivel}) translate(-540 -770)`} opacity={desk}>
            <path d="M400 470 Q400 400 470 400 L610 400 Q680 400 680 470 L680 760 L400 760 Z" fill={mix(T.paper, 0.06)} stroke={ink} strokeWidth={7} />
            <path d="M430 470 L650 470 M430 560 L650 560 M430 650 L650 650" stroke={mix(T.paper, 0.25)} strokeWidth={3} strokeDasharray="10 12" />
            <path d="M360 760 L720 760 L700 820 L380 820 Z" fill={mix(T.paper, 0.08)} stroke={ink} strokeWidth={7} />
            <path d="M372 600 L372 760 M708 600 L708 760" stroke={ink} strokeWidth={7} strokeLinecap="round" />
          </g>
          <g opacity={desk} transform={`translate(0 ${interpolate(desk, [0, 1], [40, 0])})`}>
            <rect x={110} y={880} width={860} height={44} rx={6} fill={T.paper} />
            <rect x={140} y={924} width={30} height={90} fill={T.paper} />
            <rect x={910} y={924} width={30} height={90} fill={T.paper} />
            <g transform={`rotate(${tip * 14} 640 880) translate(0 ${tip * 6})`}>
              <path d="M560 880 L580 820 L720 820 L740 880 Z" fill={T.red} />
              <text x={650} y={866} textAnchor="middle" fontFamily={FONT} fontSize={34} fontWeight={800} letterSpacing={8} fill={T.paper}>{p.plate}</text>
            </g>
          </g>
          </g>
        </svg>
        <div style={{position: 'absolute', left: 190, top: 812, opacity: logo, scale: `${interpolate(logo, [0, 1], [1.3, 1])}`}}>
          <Logo ticker={p.ticker} size={136} />
        </div>
        <BigText p={p} at={at} y={1040} />
      </AbsoluteFill>
    );
  },
};
