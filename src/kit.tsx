// Reusable primitives (background, captions, cards, source line). All colours come from the
// active palette in theme.ts, so a plan's "palette" restyles everything.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {FONT, T, mix} from './theme';

export {FONT};
// Old name kept so the hand-coded example shorts still work; it is the live palette.
export const C = T;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const pop = (frame: number, start: number, dur = 12) =>
  interpolate(frame, [start, start + dur], [0, 1], {...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1)});
export const fade = (frame: number, start: number, dur = 10) =>
  interpolate(frame, [start, start + dur], [0, 1], {...clamp, easing: ease});

export const Background: React.FC<{theme: 'dark' | 'light'}> = ({theme}) => {
  const grid = theme === 'dark' ? T.darkGrid : T.creamGrid;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme === 'dark' ? T.dark : T.cream,
        backgroundImage: `linear-gradient(${grid} 2px, transparent 2px), linear-gradient(90deg, ${grid} 2px, transparent 2px)`,
        backgroundSize: '72px 72px',
      }}
    />
  );
};

export type Word = {t: string; at: number; key?: boolean; br?: boolean; icon?: string};

// Word-by-word kinetic caption with boxed keywords (like the reference reel).
export const Caption: React.FC<{words: Word[]; theme: 'dark' | 'light'; top?: number}> = ({words, theme, top = 190}) => {
  const frame = useCurrentFrame();
  const base = theme === 'dark' ? T.paper : T.ink;
  const soft = theme === 'dark' ? mix(T.paper, 0.58) : T.inkSoft;
  const box = theme === 'dark' ? T.goldLight : T.gold;
  return (
    <div
      style={{
        position: 'absolute', top, left: 90, right: 90, textAlign: 'center',
        fontFamily: FONT, fontSize: 78, lineHeight: 1.18, letterSpacing: -1.5,
      }}
    >
      {words.map((w, i) => {
        const p = fade(frame, w.at, 7);
        const hl = pop(frame, w.at + 2, 10);
        return (
          <React.Fragment key={i}>
            {w.br ? <br /> : null}
            <span
              style={{
                display: 'inline-block', marginRight: 18, opacity: p,
                translate: `0px ${(1 - p) * 26}px`, filter: `blur(${(1 - p) * 8}px)`,
                color: w.key ? base : soft, fontWeight: w.key ? 800 : 600,
                position: 'relative', padding: w.key ? '0 10px' : 0,
              }}
            >
              {w.key ? (
                <span
                  style={{
                    position: 'absolute', inset: '4px -2px', borderRadius: 10,
                    border: `4px solid ${box}`, background: mix(T.goldLight, 0.32),
                    scale: `${hl} 1`, transformOrigin: 'left center', zIndex: -1,
                  }}
                />
              ) : null}
              {w.icon ? <span style={{marginRight: 10}}>{w.icon}</span> : null}
              {w.t}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const Card: React.FC<{style?: React.CSSProperties; children: React.ReactNode; dark?: boolean}> = ({style, children, dark}) => (
  <div
    style={{
      background: dark ? T.darkCard : T.card, borderRadius: 36,
      border: dark ? `2px solid ${mix(T.goldLight, 0.25)}` : `2px solid ${mix(T.ink, 0.08)}`,
      boxShadow: dark ? `0 40px 120px ${mix(T.goldLight, 0.14)}` : `0 40px 90px ${mix(T.ink, 0.14)}`,
      fontFamily: FONT, ...style,
    }}
  >
    {children}
  </div>
);

export const Source: React.FC<{text: string; theme: 'dark' | 'light'}> = ({text, theme}) => (
  <div
    style={{
      position: 'absolute', top: 1440, left: 0, right: 0, textAlign: 'center', fontFamily: FONT,
      fontSize: 30, color: theme === 'dark' ? mix(T.paper, 0.45) : mix(T.ink, 0.45), fontWeight: 500,
    }}
  >
    {text}
  </div>
);

export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
