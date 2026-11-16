// The end card every daily reel closes on. `save` (the default for daily reels): a one-screen recap of the
// story under "Save this", worth a screenshot, so the ask is a save rather than a click nobody makes from a reel
// (the newsletter ask lives in the post caption). free / free-alt / paid: the older promo card with the site and
// "link in bio". Wording is fixed per variant (docs/STYLE.md "End card") so the ask stays specific and calm.
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {z} from 'zod';
import {ease, fade, pop} from '../kit';
import {DISPLAY, FONT, T, fit, mix} from '../theme';
import type {SceneDef} from './types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// variant -> on-screen copy. "free" is the default ask; "free-alt" is the A/B line; "paid" is the members' offer.
export const END_COPY = {
  free: {head: 'Get the 5 numbers that moved big tech', sub: 'Free every Saturday'},
  'free-alt': {head: 'Five numbers. Sourced. Before Monday’s open.', sub: 'Free every Saturday'},
  paid: {head: 'The full why, with charts, every Sunday', sub: 'Founding members: $79 a year'},
  save: {head: 'Save this', sub: '5 numbers, free every Saturday'},
} as const;

// The spoken line that goes with each variant (the plan's `voice` for the end card should use it).
export const END_VOICE = {
  free: 'That’s one of this week’s five numbers. Get all five, free, every Saturday. Link in bio.',
  'free-alt': 'Five numbers, sourced, before Monday’s open. Free at five before monday dot com.',
  paid: 'The full why, with charts, lands Sunday for members. Founding price: seventy-nine dollars a year. Link in bio.',
  save: 'Save this one. All five numbers, free every Saturday.',
} as const;

const endSchema = z.object({
  variant: z.enum(['save', 'free', 'free-alt', 'paid']).default('free'),
  url: z.string().default('fivebeforemonday.com'),
  // save only: the recap. title names the story ("Blockbuster's 3 mistakes"), items are its beats in order.
  title: z.string().max(32).optional(),
  items: z.array(z.string().max(30)).min(2).max(4).optional(),
});

// The save card: corner brackets (a screenshot frame), SAVE THIS, the title, the numbered recap, the cadence.
const SaveCard: React.FC<{title: string; items: string[]}> = ({title, items}) => {
  const f = useCurrentFrame();
  const itemSize = Math.min(...items.map((t) => fit(t, 700, 62, 0.52)));
  const corner = (pos: React.CSSProperties) => (
    <div style={{position: 'absolute', width: 70, height: 70, borderColor: T.ink, borderStyle: 'solid', borderWidth: 0, opacity: fade(f, 0, 6), ...pos}} />
  );
  return (
    <>
      {corner({left: 70, top: 200, borderLeftWidth: 8, borderTopWidth: 8})}
      {corner({right: 70, top: 200, borderRightWidth: 8, borderTopWidth: 8})}
      {corner({left: 70, top: 1250, borderLeftWidth: 8, borderBottomWidth: 8})}
      {corner({right: 70, top: 1250, borderRightWidth: 8, borderBottomWidth: 8})}
      <div style={{position: 'absolute', left: 0, right: 0, top: 250, display: 'flex', justifyContent: 'center', opacity: fade(f, 0, 6)}}>
        <div style={{background: T.red, color: '#fff', fontFamily: FONT, fontWeight: 800, fontSize: 44, letterSpacing: 8, padding: '12px 30px 12px 38px', borderRadius: 4, scale: `${pop(f, 0, 10)}`}}>SAVE THIS</div>
      </div>
      <div style={{position: 'absolute', left: 120, right: 120, top: 370, textAlign: 'center', fontFamily: DISPLAY, fontSize: fit(title, 860, 112, 0.44), lineHeight: 1.04, color: T.ink, opacity: fade(f, 4, 8)}}>{title}</div>
      <div style={{position: 'absolute', left: 130, right: 130, top: 580, display: 'flex', flexDirection: 'column', gap: items.length > 3 ? 40 : 60}}>
        {items.map((t, i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 30, opacity: fade(f, 10 + i * 6, 8), translate: `${interpolate(f, [10 + i * 6, 22 + i * 6], [60, 0], {...clamp, easing: ease})}px 0px`}}>
            <div style={{width: 92, height: 92, borderRadius: '50%', background: T.ink, color: T.paper, fontFamily: DISPLAY, fontSize: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>{i + 1}</div>
            <div style={{fontFamily: FONT, fontWeight: 800, fontSize: itemSize, lineHeight: 1.1, color: T.ink}}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1110, display: 'flex', justifyContent: 'center', opacity: fade(f, 30, 8)}}>
        <span style={{fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 54, color: T.inkSoft}}>{END_COPY.save.sub}</span>
      </div>
    </>
  );
};

export const endCard: SceneDef<z.infer<typeof endSchema>> = {
  schema: endSchema,
  defaultTheme: 'light',
  needsSource: false,
  summary: 'Closing card (required last scene of daily reels). `variant: save` (daily default): "SAVE THIS" + `title` + 2-4 numbered recap `items`, a screenshot-worthy summary. free | free-alt | paid: logo, benefit line, site, "link in bio".',
  events: (p) => (p.variant === 'save' ? [{kind: 'impact', at: 2}, ...(p.items ?? []).map((_, i) => ({kind: 'click' as const, at: 10 + i * 6}))] : [{kind: 'impact', at: 6}, {kind: 'click', at: 30}]),
  Component: ({p}) => {
    const f = useCurrentFrame();
    if (p.variant === 'save') return <SaveCard title={p.title ?? ''} items={p.items ?? []} />;
    const copy = END_COPY[p.variant as 'free' | 'free-alt' | 'paid'];
    const rule = (at: number) => interpolate(f, [at, at + 12], [0, 1], {...clamp, easing: ease});
    const hl = interpolate(f, [30, 44], [0, 1], {...clamp, easing: ease});
    const pulse = f > 50 ? 1 + 0.025 * Math.sin(f / 4) : 1;
    return (
      <>
        {/* Logo lockup: rule, red italic 5, rule, BEFORE MONDAY */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 360, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <div style={{width: 360, borderTop: `6px solid ${T.ink}`, scale: `${rule(0)} 1`}} />
          <div style={{fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 300, lineHeight: 0.8, color: T.red, WebkitTextStroke: `3px ${T.red}`, marginTop: 18, marginBottom: -34, position: 'relative', zIndex: 1, opacity: fade(f, 2, 8), scale: `${pop(f, 2, 14)}`}}>5</div>
          <div style={{width: 360, borderTop: `6px solid ${T.ink}`, scale: `${rule(4)} 1`}} />
          <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 40, letterSpacing: 12, paddingLeft: 12, marginTop: 22, color: T.ink, opacity: fade(f, 8, 8)}}>BEFORE MONDAY</div>
        </div>
        {/* The benefit, then the cadence on a highlighter swipe */}
        <div style={{position: 'absolute', left: 100, right: 100, top: 860, textAlign: 'center', fontFamily: DISPLAY, fontSize: copy.head.length > 30 ? 84 : 96, lineHeight: 1.04, color: T.ink, opacity: fade(f, 14, 8)}}>{copy.head}</div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 1080, display: 'flex', justifyContent: 'center', opacity: fade(f, 26, 8)}}>
          <span style={{position: 'relative', isolation: 'isolate', fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 72, color: T.ink, padding: '0 14px'}}>
            <span style={{position: 'absolute', left: 0, right: 0, top: '42%', bottom: '4%', background: mix(T.goldLight, 0.9), scale: `${hl} 1`, transformOrigin: 'left center', zIndex: -1, borderRadius: '6px 14px 8px 12px', rotate: '-1deg'}} />
            {copy.sub}
          </span>
        </div>
        {/* Where to go */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 1225, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, opacity: fade(f, 34, 8)}}>
          <div style={{background: T.red, color: '#fff', fontFamily: FONT, fontWeight: 700, fontSize: 50, padding: '14px 34px', borderRadius: 4, scale: `${pulse}`}}>{p.url}</div>
          <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 36, letterSpacing: 4, color: T.inkSoft}}>LINK IN BIO</div>
        </div>
      </>
    );
  },
};
