// Reusable primitives (background, captions, cards, source line). All colours come from the
// active palette in theme.ts, so a plan's "palette" restyles everything.
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {DISPLAY, FONT, T, mix} from './theme';

export {FONT};
// Old name kept so the hand-coded example shorts still work; it is the live palette.
export const C = T;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const pop = (frame: number, start: number, dur = 12) =>
  interpolate(frame, [start, start + dur], [0, 1], {...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1)});
export const fade = (frame: number, start: number, dur = 10) =>
  interpolate(frame, [start, start + dur], [0, 1], {...clamp, easing: ease});

// Broadsheet background: a real paper texture (Paper Shaders still) for light scenes, deep navy ink
// with the same paper fibres multiplied in for dark scenes. Slow drift keeps it alive.
const PaperBackground: React.FC<{theme: 'dark' | 'light'}> = ({theme}) => {
  const f = useCurrentFrame();
  const dark = theme === 'dark';
  return (
    <AbsoluteFill style={{backgroundColor: dark ? T.dark : T.cream, overflow: 'hidden'}}>
      <Img
        src={staticFile('textures/paper-front.png')}
        style={{
          position: 'absolute', inset: -40, width: 1160, height: 2000, objectFit: 'cover',
          transform: `translate(${Math.sin(f / 90) * 8}px, ${Math.cos(f / 110) * 8}px) scale(1.02)`,
          mixBlendMode: dark ? 'soft-light' : 'multiply', opacity: dark ? 0.55 : 1,
          filter: dark ? 'contrast(1.2)' : 'brightness(1.12) contrast(0.92)',
        }}
      />
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 42%, transparent 55%, ${mix(dark ? '#000' : T.ink, dark ? 0.35 : 0.14)} 100%)`}} />
    </AbsoluteFill>
  );
};

export const Background: React.FC<{theme: 'dark' | 'light'}> = ({theme}) => {
  if (T.broadsheet) return <PaperBackground theme={theme} />;
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
  const bs = Boolean(T.broadsheet);
  return (
    <div
      style={{
        position: 'absolute', top, left: 90, right: 90, textAlign: 'center',
        fontFamily: bs ? DISPLAY : FONT, fontSize: bs ? 96 : 78, lineHeight: bs ? 1.05 : 1.18, letterSpacing: bs ? 0 : -1.5,
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
                color: bs ? base : w.key ? base : soft, fontWeight: bs ? 400 : w.key ? 800 : 600,
                fontStyle: bs && w.key ? 'italic' : 'normal',
                position: 'relative', padding: w.key ? '0 10px' : 0,
              }}
            >
              {w.key && bs ? (
                // Highlighter swipe behind the keyword: yellow on paper, red on navy.
                <span
                  style={{
                    position: 'absolute', left: -6, right: -6, top: '38%', bottom: '2%', borderRadius: '6px 14px 8px 12px',
                    background: theme === 'dark' ? mix(T.red, 0.9) : mix(T.goldLight, 0.85), rotate: '-1.2deg',
                    scale: `${hl} 1`, transformOrigin: 'left center', zIndex: -1, mixBlendMode: theme === 'dark' ? 'normal' : 'multiply',
                  }}
                />
              ) : w.key ? (
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
    style={T.broadsheet ? {
      // Newspaper panel: square corners, ink hairline frame, double rule on top.
      background: dark ? T.darkCard : T.card, borderRadius: 4,
      border: dark ? `2px solid ${mix(T.paper, 0.3)}` : `2px solid ${mix(T.ink, 0.55)}`,
      borderTop: dark ? `8px double ${mix(T.paper, 0.6)}` : `8px double ${T.ink}`,
      boxShadow: `0 30px 70px ${mix(dark ? '#000' : T.ink, dark ? 0.4 : 0.16)}`,
      fontFamily: FONT, ...style, ...(style?.borderRadius !== undefined ? {borderRadius: 4} : {}),
    } : {
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
      fontSize: 30, color: theme === 'dark' ? mix(T.paper, 0.6) : mix(T.ink, 0.6), fontWeight: T.broadsheet ? 600 : 500,
    }}
  >
    {text}
  </div>
);

// The channel handle, small and steady on every scene (above the source line).
export const Handle: React.FC<{text: string; theme: 'dark' | 'light'}> = ({text, theme}) => (
  <div
    style={{
      position: 'absolute', top: 1386, left: 0, right: 0, textAlign: 'center', fontFamily: FONT,
      fontSize: 32, fontWeight: 800, letterSpacing: T.broadsheet ? 2 : 0.5, color: theme === 'dark' ? mix(T.goldLight, 0.85) : T.gold,
    }}
  >
    {text}
  </div>
);

export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
