// Data scenes: every number, label and colour comes from the plan.
import React from 'react';
import {interpolate, random, useCurrentFrame} from 'remotion';
import {z} from 'zod';
import {Card, ease, fade, pop} from '../kit';
import {shakeAt} from '../fx';
import {CARD, FONT, T, fit, toneColor} from '../theme';
import type {SceneDef} from './types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const tone = z.enum(['bad', 'good', 'gold']).default('gold');

// Card that slides up into place at the standard position.
const Enter: React.FC<{top?: number; left?: number; width?: number; children: React.ReactNode}> = ({top = CARD.top, left = CARD.x, width = CARD.w, children}) => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left, top, width, opacity: fade(f, 0, 8), translate: `0px ${interpolate(f, [0, 14], [60, 0], {...clamp, easing: ease})}px`, fontFamily: FONT}}>
      {children}
    </div>
  );
};

const Kicker: React.FC<{text: string; dark: boolean}> = ({text, dark}) => (
  <div style={{fontSize: 30, fontWeight: 700, letterSpacing: 4, color: dark ? 'rgba(244,239,230,0.55)' : T.inkSoft, textTransform: 'uppercase'}}>{text}</div>
);

const ink = (dark: boolean) => (dark ? T.paper : T.ink);
const soft = (dark: boolean) => (dark ? 'rgba(244,239,230,0.55)' : T.inkSoft);

// ---------------------------------------------------------------- counter
const counterSchema = z.object({
  label: z.string(),
  from: z.number().default(0),
  to: z.number(),
  prefix: z.string().default(''),
  suffix: z.string().default(''),
  sign: z.enum(['', '+', '−']).default(''),
  decimals: z.number().int().min(0).max(2).default(0),
  tone,
  sub: z.string().optional(),
});
type Counter = z.infer<typeof counterSchema>;
const counterEnd = (dur: number) => Math.round(dur * 0.55);
export const counter: SceneDef<Counter> = {
  schema: counterSchema,
  defaultTheme: 'dark',
  needsSource: true,
  summary: 'Big number racing from `from` to `to` with a progress bar; the hook or headline stat.',
  events: (p, dur) => [{kind: 'ticks', at: 4, end: counterEnd(dur)}, {kind: 'impact', at: counterEnd(dur)}],
  Component: ({p, dur, theme}) => {
    const f = useCurrentFrame();
    const dark = theme === 'dark';
    const end = counterEnd(dur);
    const k = interpolate(f, [4, end], [0, 1], {...clamp, easing: ease});
    const v = p.from + (p.to - p.from) * k;
    const text = `${p.sign}${p.prefix}${v.toLocaleString('en-US', {minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals})}${p.suffix}`;
    const finalText = `${p.sign}${p.prefix}${p.to.toLocaleString('en-US', {minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals})}${p.suffix}`;
    const s = shakeAt(f, end, 16, 12);
    const c = toneColor(p.tone);
    return (
      <Enter top={640}>
        <div style={{translate: `${s.x}px ${s.y}px`}}>
          <Card dark={dark} style={{padding: '56px 48px', textAlign: 'center'}}>
            <Kicker text={p.label} dark={dark} />
            <div style={{color: p.tone === 'gold' && !dark ? T.gold : c, fontSize: fit(finalText, 720, 200), fontWeight: 900, letterSpacing: -6, marginTop: 16, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>{text}</div>
            <div style={{height: 14, borderRadius: 7, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(60,45,20,0.08)', marginTop: 20, overflow: 'hidden'}}>
              <div style={{height: 14, width: `${k * 100}%`, background: `linear-gradient(90deg, ${T.goldLight}, ${c})`}} />
            </div>
            {p.sub ? <div style={{color: ink(dark), fontSize: 44, fontWeight: 700, marginTop: 30, opacity: fade(f, end, 8)}}>{p.sub}</div> : null}
          </Card>
        </div>
      </Enter>
    );
  },
};

// ---------------------------------------------------------------- priceSlam
const slamSchema = z.object({label: z.string(), sublabel: z.string().optional(), oldValue: z.string(), newValue: z.string()});
const slamAt = (dur: number) => Math.round(dur * 0.5);
export const priceSlam: SceneDef<z.infer<typeof slamSchema>> = {
  schema: slamSchema,
  defaultTheme: 'dark',
  needsSource: true,
  summary: 'Old value gets struck through, new value tag slams on with a shake. Price changes, before/after.',
  events: (_p, dur) => [{kind: 'impact', at: slamAt(dur)}],
  Component: ({p, dur, theme}) => {
    const f = useCurrentFrame();
    const dark = theme === 'dark';
    const at = slamAt(dur);
    const slam = pop(f, at, 10);
    const s = shakeAt(f, at, 20, 12);
    return (
      <Enter top={660}>
        <div style={{rotate: '-5deg', translate: `${s.x}px ${s.y}px`}}>
          <Card dark={dark} style={{padding: 56, position: 'relative', height: 520, boxSizing: 'border-box'}}>
            <div style={{color: dark ? T.goldLight : T.gold, fontSize: 38, fontWeight: 800, letterSpacing: 5}}>{p.label}</div>
            {p.sublabel ? <div style={{color: soft(dark), fontSize: 32, marginTop: 10, fontWeight: 500}}>{p.sublabel}</div> : null}
            <div style={{position: 'relative', marginTop: 36, display: 'inline-block'}}>
              <div style={{color: ink(dark), fontSize: fit(p.oldValue, 640, 180), fontWeight: 800, letterSpacing: -6, opacity: 1 - slam * 0.55, whiteSpace: 'nowrap'}}>{p.oldValue}</div>
              <div style={{position: 'absolute', left: -10, top: '52%', height: 14, borderRadius: 7, background: T.red, width: `${interpolate(f, [at - 6, at + 2], [0, 105], clamp)}%`}} />
            </div>
            <div style={{position: 'absolute', right: 30, bottom: -60, background: T.goldLight, color: T.ink, borderRadius: 28, padding: '18px 40px', fontSize: fit(p.newValue, 460, 110), fontWeight: 900, letterSpacing: -4, rotate: '8deg', scale: `${slam}`, boxShadow: '0 30px 80px rgba(242,194,91,0.45)', whiteSpace: 'nowrap'}}>
              {p.newValue}
            </div>
          </Card>
        </div>
      </Enter>
    );
  },
};

// ---------------------------------------------------------------- compareBars
const compareSchema = z.object({
  title: z.string(),
  bars: z.array(z.object({label: z.string(), value: z.number().nonnegative(), display: z.string(), highlight: z.boolean().default(false)})).min(2).max(4),
  badge: z.string().optional(),
});
export const compareBars: SceneDef<z.infer<typeof compareSchema>> = {
  schema: compareSchema,
  defaultTheme: 'light',
  needsSource: true,
  summary: '2-4 vertical glass bars filling to scale with their values, optional badge (e.g. "2.2x"). Then vs now, A vs B.',
  events: (p, dur) => [...p.bars.map((_, i) => ({kind: 'click' as const, at: 8 + i * 12})), ...(p.badge ? [{kind: 'impact' as const, at: Math.round(dur * 0.6)}] : [])],
  Component: ({p, dur, theme}) => {
    const f = useCurrentFrame();
    const dark = theme === 'dark';
    const max = Math.max(...p.bars.map((b) => b.value));
    const H = 520;
    const badgeAt = Math.round(dur * 0.6);
    const w = p.bars.length > 3 ? 120 : 160;
    return (
      <Enter top={500}>
        <Card dark={dark} style={{padding: 48, position: 'relative'}}>
          <Kicker text={p.title} dark={dark} />
          <div style={{display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: 40}}>
            {p.bars.map((b, i) => {
              const k = interpolate(f, [8 + i * 12, 34 + i * 12], [0, 1], {...clamp, easing: ease});
              const strong = b.highlight;
              return (
                <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 200}}>
                  <div style={{fontSize: fit(b.display, 200, 60), fontWeight: 800, color: strong ? (dark ? T.goldLight : T.gold) : soft(dark), letterSpacing: -2, marginBottom: 18, opacity: k, whiteSpace: 'nowrap'}}>{b.display}</div>
                  <div style={{width: w, height: H, borderRadius: w / 2, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(60,45,20,0.06)', border: dark ? '3px solid rgba(255,255,255,0.1)' : '3px solid rgba(60,45,20,0.1)', position: 'relative', overflow: 'hidden'}}>
                    <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: (H * b.value * k) / max, borderRadius: w / 2, background: strong ? `linear-gradient(180deg, ${T.goldLight}, ${T.gold})` : 'linear-gradient(180deg, #d9d2c5, #b8afa0)'}} />
                  </div>
                  <div style={{fontSize: 32, fontWeight: 700, color: ink(dark), marginTop: 20, textAlign: 'center'}}>{b.label}</div>
                </div>
              );
            })}
          </div>
          {p.badge ? (
            <div style={{position: 'absolute', left: '50%', top: 330, translate: '-50% 0', background: dark ? T.goldLight : T.ink, color: dark ? T.ink : T.goldLight, borderRadius: 28, padding: '12px 36px', fontSize: fit(p.badge, 300, 110), fontWeight: 900, letterSpacing: -4, scale: `${pop(f, badgeAt, 12)}`, rotate: '-5deg', boxShadow: '0 30px 70px rgba(25,21,16,0.35)', whiteSpace: 'nowrap'}}>
              {p.badge}
            </div>
          ) : null}
        </Card>
      </Enter>
    );
  },
};

// ---------------------------------------------------------------- lineMove
const lineSchema = z.object({
  title: z.string(),
  startLabel: z.string(),
  direction: z.enum(['down', 'up']),
  badge: z.string(),
  note: z.string().default('line shape illustrative · endpoints from source'),
});
export const lineMove: SceneDef<z.infer<typeof lineSchema>> = {
  schema: lineSchema,
  defaultTheme: 'light',
  needsSource: true,
  summary: 'A line drawing down (or up) from a labelled start point to a % badge. Index or price moves. Shape is illustrative and says so.',
  events: (_p, dur) => [{kind: 'impact', at: Math.round(dur * 0.55)}],
  Component: ({p, dur, theme}) => {
    const f = useCurrentFrame();
    const dark = theme === 'dark';
    const end = Math.round(dur * 0.55);
    const draw = interpolate(f, [4, end], [0, 1], {...clamp, easing: ease});
    const down = p.direction === 'down';
    const c = down ? T.red : T.green;
    const pts = Array.from({length: 9}).map((_, i) => {
      const x = 40 + i * 80;
      const trend = 70 + (i / 8) * 260;
      const jitter = i === 0 || i === 8 ? 0 : (random(`${p.title}-${i}`) - 0.5) * 60;
      const y = down ? trend + jitter : 400 - trend + jitter;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y.toFixed(0)}`;
    });
    const startY = down ? 70 : 330;
    const endY = down ? 330 : 70;
    return (
      <Enter top={540}>
        <Card dark={dark} style={{height: 740, padding: 44, boxSizing: 'border-box', position: 'relative'}}>
          <Kicker text={p.title} dark={dark} />
          <svg width={720} height={420} style={{marginTop: 30, overflow: 'visible'}}>
            <line x1={0} x2={720} y1={startY} y2={startY} stroke={dark ? 'rgba(255,255,255,0.2)' : 'rgba(60,45,20,0.25)'} strokeWidth={3} strokeDasharray="10 10" />
            <path d={pts.join(' ')} fill="none" stroke={c} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            <circle cx={40} cy={startY} r={14} fill={T.gold} />
            <text x={62} y={startY - 20} fontFamily={FONT} fontSize={30} fontWeight={700} fill={T.gold}>{p.startLabel}</text>
            <circle cx={680} cy={endY} r={14 * draw} fill={c} />
          </svg>
          <div style={{position: 'absolute', right: 60, top: down ? 520 : 180, background: c, color: '#fff', borderRadius: 24, padding: '10px 30px', fontSize: fit(p.badge, 320, 96), fontWeight: 900, letterSpacing: -3, scale: `${pop(f, end, 10)}`, rotate: '-4deg', whiteSpace: 'nowrap'}}>{p.badge}</div>
          <div style={{position: 'absolute', left: 44, bottom: 36, fontSize: 24, color: soft(dark), fontWeight: 500}}>{p.note}</div>
        </Card>
      </Enter>
    );
  },
};

// ---------------------------------------------------------------- scoreboard
const scoreSchema = z.object({
  title: z.string(),
  rows: z.array(z.object({name: z.string(), value: z.string(), up: z.boolean(), hero: z.boolean().default(false)})).min(2).max(5),
  footnote: z.string().optional(),
});
export const scoreboard: SceneDef<z.infer<typeof scoreSchema>> = {
  schema: scoreSchema,
  defaultTheme: 'light',
  needsSource: true,
  summary: 'Rows of names with green up / red down values popping in; one hero row outlined. Index closes, rankings, winners vs losers.',
  events: (p) => p.rows.map((_, i) => ({kind: 'click' as const, at: 12 + i * 6})),
  Component: ({p, dur, theme}) => {
    const f = useCurrentFrame();
    const dark = theme === 'dark';
    return (
      <Enter>
        <Card dark={dark} style={{padding: 44}}>
          <Kicker text={p.title} dark={dark} />
          {p.rows.map((r, i) => {
            const s = pop(f, 12 + i * 6, 10);
            const c = r.up ? T.green : T.red;
            return (
              <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, padding: '26px 32px', borderRadius: 24, background: r.hero ? (r.up ? 'rgba(47,163,107,0.12)' : 'rgba(224,72,61,0.12)') : dark ? 'rgba(255,255,255,0.04)' : 'rgba(60,45,20,0.04)', border: r.hero ? `4px solid ${c}` : '4px solid transparent', scale: `${0.9 + 0.1 * s}`, opacity: s}}>
                <div style={{fontSize: fit(r.name, 380, 56), fontWeight: 800, color: ink(dark), whiteSpace: 'nowrap'}}>{r.name}</div>
                <div style={{fontSize: fit(r.value, 300, 60), fontWeight: 900, color: c, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>{r.up ? '▲ ' : '▼ '}{r.value}</div>
              </div>
            );
          })}
          {p.footnote ? <div style={{fontSize: 32, color: soft(dark), marginTop: 28, fontWeight: 600, textAlign: 'center', opacity: fade(f, Math.round(dur * 0.55), 8)}}>{p.footnote}</div> : null}
        </Card>
      </Enter>
    );
  },
};

// ---------------------------------------------------------------- stampList
const stampSchema = z.object({
  windowTitle: z.string(),
  rows: z.array(z.object({name: z.string(), value: z.string(), stamped: z.boolean().default(true)})).min(1).max(4),
  stamp: z.string().default('REMOVED'),
  footnote: z.string().optional(),
});
export const stampList: SceneDef<z.infer<typeof stampSchema>> = {
  schema: stampSchema,
  defaultTheme: 'light',
  needsSource: true,
  summary: 'App/store window with rows; red stamps (REMOVED, BANNED, DELAYED...) slam onto chosen rows. Pulled products, cancelled deals.',
  events: (p) => p.rows.flatMap((r, i) => (r.stamped ? [{kind: 'impact' as const, at: 16 + i * 12}] : [])),
  Component: ({p, theme}) => {
    const f = useCurrentFrame();
    const dark = theme === 'dark';
    return (
      <Enter top={520}>
        <Card dark={dark} style={{padding: 44}}>
          <div style={{display: 'flex', gap: 14, marginBottom: 26, alignItems: 'center'}}>
            {['#e66a5e', '#e8b84a', '#7cc46b'].map((c) => <div key={c} style={{width: 22, height: 22, borderRadius: '50%', background: c}} />)}
            <div style={{marginLeft: 20, fontSize: 30, fontWeight: 600, color: soft(dark)}}>{p.windowTitle}</div>
          </div>
          {p.rows.map((r, i) => {
            const s = r.stamped ? pop(f, 16 + i * 12, 8) : 0;
            return (
              <div key={i} style={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '34px 32px', borderRadius: 24, background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(60,45,20,0.04)', marginTop: 20}}>
                <div style={{fontSize: fit(r.name, 420, 46), fontWeight: 800, color: ink(dark), opacity: 1 - s * 0.6, whiteSpace: 'nowrap'}}>{r.name}</div>
                <div style={{fontSize: 42, fontWeight: 700, color: soft(dark), opacity: 1 - s * 0.6}}>{r.value}</div>
                {r.stamped ? (
                  <div style={{position: 'absolute', right: 14, top: 22, border: `6px solid ${T.red}`, color: T.red, borderRadius: 14, padding: '6px 22px', fontSize: fit(p.stamp, 300, 52), fontWeight: 900, letterSpacing: 4, rotate: '-10deg', scale: `${interpolate(s, [0, 1], [2.2, 1])}`, opacity: s, background: dark ? 'rgba(23,20,15,0.85)' : 'rgba(255,253,248,0.85)', whiteSpace: 'nowrap'}}>
                    {p.stamp}
                  </div>
                ) : null}
              </div>
            );
          })}
          {p.footnote ? <div style={{fontSize: 30, color: soft(dark), marginTop: 30, fontWeight: 500, textAlign: 'center'}}>{p.footnote}</div> : null}
        </Card>
      </Enter>
    );
  },
};

// ---------------------------------------------------------------- timeline
const timelineSchema = z.object({
  items: z.array(z.object({label: z.string().max(5), value: z.string()})).min(2).max(4),
  note: z.string().optional(),
  noteHighlight: z.string().optional(),
});
export const timeline: SceneDef<z.infer<typeof timelineSchema>> = {
  schema: timelineSchema,
  defaultTheme: 'dark',
  needsSource: true,
  summary: 'Gold line with 2-4 dated circles popping in (labels up to 5 chars, e.g. JAN), plus an optional explainer card. Repeated events, patterns.',
  events: (p) => p.items.map((_, i) => ({kind: 'click' as const, at: 8 + i * 6})),
  Component: ({p, dur, theme}) => {
    const f = useCurrentFrame();
    const dark = theme === 'dark';
    const noteAt = Math.round(dur * 0.45);
    const parts = p.note && p.noteHighlight ? p.note.split(p.noteHighlight) : null;
    return (
      <div style={{position: 'absolute', left: CARD.x, top: 560, width: CARD.w, fontFamily: FONT}}>
        <div style={{position: 'absolute', left: 70, right: 70, top: 66, height: 6, background: 'rgba(242,194,91,0.18)', borderRadius: 3}}>
          <div style={{height: 6, borderRadius: 3, background: T.goldLight, width: `${interpolate(f, [6, 26], [0, 100], {...clamp, easing: ease})}%`}} />
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between'}}>
          {p.items.map((it, i) => (
            <div key={i} style={{width: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', scale: `${pop(f, 8 + i * 6, 10)}`}}>
              <div style={{width: 136, height: 136, borderRadius: '50%', background: dark ? T.darkCard : T.card, border: `5px solid ${T.goldLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dark ? T.goldLight : T.gold, fontSize: 38, fontWeight: 800, boxShadow: '0 0 60px rgba(242,194,91,0.35)'}}>{it.label}</div>
              <div style={{color: ink(dark), fontSize: fit(it.value, 220, 44), fontWeight: 800, marginTop: 22, whiteSpace: 'nowrap'}}>{it.value}</div>
            </div>
          ))}
        </div>
        {p.note ? (
          <div style={{marginTop: 80, opacity: fade(f, noteAt, 10), translate: `0px ${interpolate(f, [noteAt, noteAt + 12], [40, 0], {...clamp, easing: ease})}px`}}>
            <Card dark={dark} style={{padding: '40px 44px', color: ink(dark), fontSize: 44, fontWeight: 700, lineHeight: 1.2}}>
              {parts ? <>{parts[0]}<span style={{color: dark ? T.goldLight : T.gold}}>{p.noteHighlight}</span>{parts.slice(1).join(p.noteHighlight)}</> : p.note}
            </Card>
          </div>
        ) : null}
      </div>
    );
  },
};

// ---------------------------------------------------------------- calendarCta
const calSchema = z.object({day: z.string().max(4), date: z.string(), event: z.string(), cta: z.string().default('Follow so you see what happens →')});
export const calendarCta: SceneDef<z.infer<typeof calSchema>> = {
  schema: calSchema,
  defaultTheme: 'dark',
  needsSource: false,
  summary: 'Calendar card for an upcoming date + pulsing follow line. Use as the open-loop ending ("the next test lands Friday").',
  events: (_p, dur) => [{kind: 'impact', at: 4}, {kind: 'click', at: Math.round(dur * 0.45)}],
  Component: ({p, dur, theme}) => {
    const f = useCurrentFrame();
    const dark = theme === 'dark';
    const ctaAt = Math.round(dur * 0.45);
    const pulse = f > ctaAt + 8 ? 1 + 0.04 * Math.sin(f / 3) : 1;
    return (
      <>
        <div style={{position: 'absolute', left: 270, top: 560, opacity: fade(f, 0, 8), scale: `${pop(f, 2, 14)}`, fontFamily: FONT}}>
          <Card dark={dark} style={{width: 540, height: 560, overflow: 'hidden'}}>
            <div style={{height: 130, background: T.goldLight, color: T.ink, fontSize: 64, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: 6}}>{p.day}</div>
            <div style={{color: ink(dark), fontSize: fit(p.date, 470, 170), fontWeight: 900, textAlign: 'center', marginTop: 50, letterSpacing: -5, whiteSpace: 'nowrap'}}>{p.date}</div>
            <div style={{color: dark ? T.goldLight : T.gold, fontSize: fit(p.event, 480, 44, 0.55), fontWeight: 800, textAlign: 'center', marginTop: 4, whiteSpace: 'nowrap'}}>{p.event}</div>
          </Card>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 1210, textAlign: 'center', fontFamily: FONT, fontSize: fit(p.cta, 820, 50, 0.55), fontWeight: 800, color: ink(dark), opacity: fade(f, ctaAt, 8), scale: `${pulse}`}}>{p.cta}</div>
      </>
    );
  },
};

// ---------------------------------------------------------------- barRank
const rankSchema = z.object({
  title: z.string(),
  bars: z.array(z.object({label: z.string(), value: z.number(), display: z.string(), highlight: z.boolean().default(false)})).min(3).max(6),
});
export const barRank: SceneDef<z.infer<typeof rankSchema>> = {
  schema: rankSchema,
  defaultTheme: 'light',
  needsSource: true,
  summary: '3-6 horizontal bars ranked largest first, growing in turn; highlight one. Rankings, biggest movers, market share. Negative values draw red.',
  events: (p) => p.bars.map((_, i) => ({kind: 'click' as const, at: 8 + i * 5})),
  Component: ({p, theme}) => {
    const f = useCurrentFrame();
    const dark = theme === 'dark';
    const bars = [...p.bars].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const max = Math.max(...bars.map((b) => Math.abs(b.value)));
    return (
      <Enter top={520}>
        <Card dark={dark} style={{padding: 44}}>
          <Kicker text={p.title} dark={dark} />
          {bars.map((b, i) => {
            const k = interpolate(f, [8 + i * 5, 28 + i * 5], [0, 1], {...clamp, easing: ease});
            const c = b.value < 0 ? T.red : b.highlight ? T.goldLight : dark ? '#5a5247' : '#cfc6b6';
            return (
              <div key={i} style={{marginTop: 26}}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 34, fontWeight: 800, color: ink(dark)}}>
                  <span style={{whiteSpace: 'nowrap'}}>{b.label}</span>
                  <span style={{color: b.value < 0 ? T.red : b.highlight ? (dark ? T.goldLight : T.gold) : soft(dark), opacity: k}}>{b.display}</span>
                </div>
                <div style={{height: 36, borderRadius: 18, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(60,45,20,0.05)', marginTop: 10}}>
                  <div style={{height: 36, borderRadius: 18, width: `${(Math.abs(b.value) / max) * 100 * k}%`, background: c}} />
                </div>
              </div>
            );
          })}
        </Card>
      </Enter>
    );
  },
};

// ---------------------------------------------------------------- donut
const donutSchema = z.object({
  title: z.string(),
  segments: z.array(z.object({label: z.string(), value: z.number().positive(), highlight: z.boolean().default(false)})).min(2).max(5),
  center: z.string(),
  centerSub: z.string().optional(),
});
export const donut: SceneDef<z.infer<typeof donutSchema>> = {
  schema: donutSchema,
  defaultTheme: 'light',
  needsSource: true,
  summary: 'Donut chart drawing its segments in turn with a big centre figure; legend below. Shares of a whole.',
  events: (_p, dur) => [{kind: 'impact', at: Math.round(dur * 0.5)}],
  Component: ({p, dur, theme}) => {
    const f = useCurrentFrame();
    const dark = theme === 'dark';
    const total = p.segments.reduce((s, x) => s + x.value, 0);
    const R = 190;
    const circ = 2 * Math.PI * R;
    // Neutral shades for the non-highlighted slices: red/green would read as bad/good news.
    const palette = dark ? [T.goldLight, '#8d857a', '#5f574c', '#a89f90', '#3c362e'] : [T.goldLight, '#8d857a', '#c9bfae', '#5f574c', '#e2dccf'];
    let acc = 0;
    const draw = interpolate(f, [4, Math.round(dur * 0.5)], [0, 1], {...clamp, easing: ease});
    return (
      <Enter top={500}>
        <Card dark={dark} style={{padding: 44}}>
          <Kicker text={p.title} dark={dark} />
          <div style={{position: 'relative', width: 480, height: 480, margin: '30px auto 0'}}>
            <svg width={480} height={480} style={{rotate: '-90deg'}}>
              {p.segments.map((s, i) => {
                const len = (s.value / total) * circ;
                const start = acc;
                acc += len;
                const shown = Math.max(0, Math.min(len, draw * circ - start));
                const c = s.highlight ? T.goldLight : palette[(i + 1) % palette.length];
                return <circle key={i} cx={240} cy={240} r={R} fill="none" stroke={c} strokeWidth={s.highlight ? 76 : 60} strokeDasharray={`${shown} ${circ}`} strokeDashoffset={-start} />;
              })}
            </svg>
            <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
              <div style={{fontSize: fit(p.center, 260, 96), fontWeight: 900, color: ink(dark), letterSpacing: -3, scale: `${pop(f, Math.round(dur * 0.5), 10)}`, whiteSpace: 'nowrap'}}>{p.center}</div>
              {p.centerSub ? <div style={{fontSize: 28, fontWeight: 700, color: soft(dark), marginTop: 4}}>{p.centerSub}</div> : null}
            </div>
          </div>
          <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px 28px', marginTop: 28}}>
            {p.segments.map((s, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 30, fontWeight: 700, color: ink(dark)}}>
                <div style={{width: 22, height: 22, borderRadius: 6, background: s.highlight ? T.goldLight : palette[(i + 1) % palette.length]}} />
                {s.label} {Math.round((s.value / total) * 100)}%
              </div>
            ))}
          </div>
        </Card>
      </Enter>
    );
  },
};

// ---------------------------------------------------------------- grid100
const gridSchema = z.object({highlight: z.number().int().min(1).max(99), label: z.string(), sub: z.string().optional(), tone});
export const grid100: SceneDef<z.infer<typeof gridSchema>> = {
  schema: gridSchema,
  defaultTheme: 'light',
  needsSource: true,
  summary: '10x10 grid of squares; `highlight` of them light up. "Only 3 in 100...", odds, shares of people.',
  events: (_p, dur) => [{kind: 'ticks', at: 4, end: 26}, {kind: 'impact', at: Math.round(dur * 0.45)}],
  Component: ({p, dur, theme}) => {
    const f = useCurrentFrame();
    const dark = theme === 'dark';
    const on = Math.round(dur * 0.45);
    const c = toneColor(p.tone);
    const lit = new Set(Array.from({length: 100}, (_, i) => i).sort((a, b) => random(`g${a}`) - random(`g${b}`)).slice(0, p.highlight));
    return (
      <Enter top={470}>
        <Card dark={dark} style={{padding: 44, textAlign: 'center'}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(10, 52px)', gap: 10, justifyContent: 'center'}}>
            {Array.from({length: 100}).map((_, i) => {
              const appear = fade(f, 4 + (i % 10) + Math.floor(i / 10) * 2, 6);
              const isLit = lit.has(i) && f >= on;
              return <div key={i} style={{width: 52, height: 52, borderRadius: 12, opacity: appear, background: isLit ? c : dark ? 'rgba(255,255,255,0.08)' : 'rgba(60,45,20,0.08)', scale: isLit ? `${0.8 + 0.2 * pop(f, on, 8)}` : '1', boxShadow: isLit ? `0 0 26px ${c}` : 'none'}} />;
            })}
          </div>
          <div style={{fontSize: fit(p.label, 720, 64, 0.55), fontWeight: 900, color: ink(dark), marginTop: 36, opacity: fade(f, on, 8), whiteSpace: 'nowrap'}}>{p.label}</div>
          {p.sub ? <div style={{fontSize: 32, fontWeight: 600, color: soft(dark), marginTop: 8, opacity: fade(f, on + 4, 8)}}>{p.sub}</div> : null}
        </Card>
      </Enter>
    );
  },
};

// ---------------------------------------------------------------- versus
const side = z.object({name: z.string(), value: z.string(), caption: z.string().optional()});
const versusSchema = z.object({left: side, right: side, winner: z.enum(['left', 'right', 'none']).default('none')});
export const versus: SceneDef<z.infer<typeof versusSchema>> = {
  schema: versusSchema,
  defaultTheme: 'dark',
  needsSource: true,
  summary: 'Split screen A vs B with a VS badge; the winner side glows gold. Two companies, two countries, two policies.',
  events: (_p, dur) => [{kind: 'impact', at: 10}, {kind: 'impact', at: Math.round(dur * 0.5)}],
  Component: ({p, dur, theme}) => {
    const f = useCurrentFrame();
    const dark = theme === 'dark';
    const winAt = Math.round(dur * 0.5);
    const Side: React.FC<{s: z.infer<typeof side>; from: number; win: boolean}> = ({s, from, win}) => (
      <div style={{flex: 1, translate: `${interpolate(f, [0, 12], [from, 0], {...clamp, easing: ease})}px 0px`, opacity: fade(f, 0, 8)}}>
        <Card dark={dark} style={{height: 560, padding: 36, boxSizing: 'border-box', textAlign: 'center', border: win && f >= winAt ? `5px solid ${T.goldLight}` : undefined, boxShadow: win && f >= winAt ? '0 0 80px rgba(242,194,91,0.45)' : undefined}}>
          <div style={{fontSize: fit(s.name, 320, 52), fontWeight: 900, color: ink(dark), whiteSpace: 'nowrap'}}>{s.name}</div>
          <div style={{fontSize: fit(s.value, 320, 110), fontWeight: 900, color: win && f >= winAt ? (dark ? T.goldLight : T.gold) : ink(dark), marginTop: 120, letterSpacing: -3, whiteSpace: 'nowrap'}}>{s.value}</div>
          {s.caption ? <div style={{fontSize: 28, fontWeight: 600, color: soft(dark), marginTop: 14}}>{s.caption}</div> : null}
        </Card>
      </div>
    );
    return (
      <div style={{position: 'absolute', left: CARD.x, top: 600, width: CARD.w, display: 'flex', gap: 40, fontFamily: FONT}}>
        <Side s={p.left} from={-300} win={p.winner === 'left'} />
        <Side s={p.right} from={300} win={p.winner === 'right'} />
        <div style={{position: 'absolute', left: '50%', top: 230, translate: '-50% 0', width: 110, height: 110, borderRadius: '50%', background: T.red, color: '#fff', fontSize: 44, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', scale: `${pop(f, 10, 10)}`}}>VS</div>
      </div>
    );
  },
};

// ---------------------------------------------------------------- chapters (open loop)
const chaptersSchema = z.object({items: z.array(z.string()).min(3).max(5), unlocked: z.number().int().min(0).default(0)});
export const chapters: SceneDef<z.infer<typeof chaptersSchema>> = {
  schema: chaptersSchema,
  defaultTheme: 'light',
  needsSource: false,
  summary: 'Numbered cards with locks and a progress bar: the visible open loop ("4 things..."). `unlocked` shows how many are revealed.',
  events: (p) => p.items.map((_, i) => ({kind: 'click' as const, at: 6 + i * 6})),
  Component: ({p, theme}) => {
    const f = useCurrentFrame();
    const dark = theme === 'dark';
    return (
      <Enter top={540}>
        <div style={{display: 'flex', gap: 10, marginBottom: 30}}>
          {p.items.map((_, i) => <div key={i} style={{flex: 1, height: 12, borderRadius: 6, background: i < p.unlocked ? T.goldLight : dark ? 'rgba(255,255,255,0.12)' : 'rgba(60,45,20,0.12)'}} />)}
        </div>
        {p.items.map((t, i) => {
          const open = i < p.unlocked;
          return (
            <div key={i} style={{marginTop: 18, opacity: fade(f, 6 + i * 6, 8), translate: `${interpolate(f, [6 + i * 6, 18 + i * 6], [80, 0], {...clamp, easing: ease})}px 0px`}}>
              <Card dark={dark} style={{display: 'flex', alignItems: 'center', gap: 28, padding: '28px 34px'}}>
                <div style={{width: 76, height: 76, borderRadius: 20, background: open ? T.goldLight : dark ? '#2a251e' : '#ece5d8', color: T.ink, fontSize: 40, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>{i + 1}</div>
                <div style={{fontSize: fit(t, 520, 44, 0.55), fontWeight: 800, color: open ? ink(dark) : soft(dark), filter: open ? 'none' : 'blur(9px)', whiteSpace: 'nowrap', flex: 1}}>{t}</div>
                {!open ? (
                  <div style={{position: 'relative', width: 44, height: 52, flexShrink: 0}}>
                    <div style={{position: 'absolute', left: 8, top: 0, width: 28, height: 30, border: `6px solid ${T.gold}`, borderBottom: 'none', borderRadius: '16px 16px 0 0', boxSizing: 'border-box'}} />
                    <div style={{position: 'absolute', left: 0, top: 22, width: 44, height: 30, borderRadius: 8, background: T.gold}} />
                  </div>
                ) : null}
              </Card>
            </div>
          );
        })}
      </Enter>
    );
  },
};

// ---------------------------------------------------------------- headline
const headlineSchema = z.object({outlet: z.string(), date: z.string(), text: z.string(), highlight: z.string().optional()});
export const headline: SceneDef<z.infer<typeof headlineSchema>> = {
  schema: headlineSchema,
  defaultTheme: 'light',
  needsSource: true,
  summary: 'A news-headline card (outlet name as plain text, no logos) with one phrase marker-highlighted. Quoting what was reported.',
  events: (_p, dur) => [{kind: 'click', at: Math.round(dur * 0.4)}],
  Component: ({p, dur, theme}) => {
    const f = useCurrentFrame();
    const dark = theme === 'dark';
    const hl = interpolate(f, [Math.round(dur * 0.4), Math.round(dur * 0.4) + 10], [0, 100], {...clamp, easing: ease});
    const parts = p.highlight ? p.text.split(p.highlight) : [p.text];
    return (
      <Enter top={600}>
        <Card dark={dark} style={{padding: '48px 50px', rotate: '-1.5deg'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 28, fontWeight: 700, color: soft(dark), letterSpacing: 2}}>
            <span>{p.outlet.toUpperCase()}</span>
            <span>{p.date}</span>
          </div>
          <div style={{height: 3, background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(60,45,20,0.12)', margin: '24px 0 30px'}} />
          <div style={{fontSize: 60, lineHeight: 1.18, fontWeight: 800, color: ink(dark), letterSpacing: -1}}>
            {parts[0]}
            {p.highlight ? (
              <span style={{backgroundImage: `linear-gradient(${T.goldLight}, ${T.goldLight})`, backgroundSize: `${hl}% 42%`, backgroundPosition: '0 85%', backgroundRepeat: 'no-repeat', color: ink(dark)}}>{p.highlight}</span>
            ) : null}
            {parts.slice(1).join(p.highlight ?? '')}
          </div>
        </Card>
      </Enter>
    );
  },
};
