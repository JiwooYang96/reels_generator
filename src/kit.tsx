// Reusable scene primitives in the "gold & cream explainer" style.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

export const C = {
  dark: '#0c0b0a',
  darkGrid: 'rgba(255,255,255,0.045)',
  cream: '#f5f0e6',
  creamGrid: 'rgba(60,45,20,0.06)',
  gold: '#c98a1e',
  goldLight: '#f2c25b',
  ink: '#191510',
  inkSoft: '#8d857a',
  red: '#d9443a',
  card: '#fffdf8',
};

export const FONT = 'Inter, "Inter Display", sans-serif';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const pop = (frame: number, start: number, dur = 12) =>
  interpolate(frame, [start, start + dur], [0, 1], {...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1)});
export const fade = (frame: number, start: number, dur = 10) =>
  interpolate(frame, [start, start + dur], [0, 1], {...clamp, easing: ease});

export const Background: React.FC<{theme: 'dark' | 'light'}> = ({theme}) => {
  const grid = theme === 'dark' ? C.darkGrid : C.creamGrid;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme === 'dark' ? C.dark : C.cream,
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
  const base = theme === 'dark' ? '#f4efe6' : C.ink;
  const soft = theme === 'dark' ? 'rgba(244,239,230,0.55)' : C.inkSoft;
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
                    border: `4px solid ${C.gold}`, background: 'rgba(242,194,91,0.28)',
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
      background: dark ? '#17140f' : C.card, borderRadius: 36,
      border: dark ? '2px solid rgba(242,194,91,0.25)' : '2px solid rgba(60,45,20,0.08)',
      boxShadow: dark ? '0 40px 120px rgba(201,138,30,0.18)' : '0 40px 90px rgba(80,55,15,0.16)',
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
      fontSize: 30, color: theme === 'dark' ? 'rgba(244,239,230,0.45)' : 'rgba(25,21,16,0.45)', fontWeight: 500,
    }}
  >
    {text}
  </div>
);

export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
