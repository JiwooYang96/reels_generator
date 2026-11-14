// The promo end card every daily reel closes on: the Five Before Monday logo, one benefit line, the site and
// "link in bio". Wording is fixed per variant (docs/STYLE.md "End card") so the ask stays specific and calm.
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {z} from 'zod';
import {ease, fade, pop} from '../kit';
import {DISPLAY, FONT, T, mix} from '../theme';
import type {SceneDef} from './types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// variant -> on-screen copy. "free" is the default ask; "free-alt" is the A/B line; "paid" is the members' offer.
export const END_COPY = {
  free: {head: 'Get the 5 numbers that moved big tech', sub: 'Free every Saturday'},
  'free-alt': {head: 'Five numbers. Sourced. Before Monday’s open.', sub: 'Free every Saturday'},
  paid: {head: 'The full why, with charts, every Sunday', sub: 'Founding members: $79 a year'},
} as const;

// The spoken line that goes with each variant (the plan's `voice` for the end card should use it).
export const END_VOICE = {
  free: 'That’s one of this week’s five numbers. Get all five, free, every Saturday. Link in bio.',
  'free-alt': 'Five numbers, sourced, before Monday’s open. Free at five before monday dot com.',
  paid: 'The full why, with charts, lands Sunday for members. Founding price: seventy-nine dollars a year. Link in bio.',
} as const;

const endSchema = z.object({
  variant: z.enum(['free', 'free-alt', 'paid']).default('free'),
  url: z.string().default('fivebeforemonday.com'),
});

export const endCard: SceneDef<z.infer<typeof endSchema>> = {
  schema: endSchema,
  defaultTheme: 'light',
  needsSource: false,
  summary: 'Closing promo card (required last scene of daily reels): logo, benefit line, site, "link in bio". `variant`: free (default) | free-alt | paid.',
  events: () => [{kind: 'impact', at: 6}, {kind: 'click', at: 30}],
  Component: ({p}) => {
    const f = useCurrentFrame();
    const copy = END_COPY[p.variant];
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
