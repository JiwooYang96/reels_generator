// Company logo on a tile. Logos come unaltered from nvstly/icons (public/logos, see NOTICE.md).
// White logos sit on a dark tile, everything else on a white tile, so every logo stays visible
// on both dark and light scenes. Unknown tickers fall back to a gold ticker tile.
import React from 'react';
import {Img, staticFile} from 'remotion';
import manifest from '../public/logos/manifest.json';
import {FONT, T, mix} from './theme';

type Entry = {name: string; tile: 'light' | 'dark'; source: string};
const LOGOS = manifest as Record<string, Entry>;

export const hasLogo = (ticker: string) => Boolean(LOGOS[ticker.toUpperCase()]);
export const logoName = (ticker: string) => LOGOS[ticker.toUpperCase()]?.name ?? ticker.toUpperCase();

export const Logo: React.FC<{ticker: string; size: number; style?: React.CSSProperties}> = ({ticker, size, style}) => {
  const t = ticker.toUpperCase();
  const e = LOGOS[t];
  const base: React.CSSProperties = {
    width: size, height: size, borderRadius: size * 0.22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: `0 ${size * 0.06}px ${size * 0.2}px rgba(0,0,0,0.18)`, overflow: 'hidden', ...style,
  };
  if (!e) {
    return (
      <div style={{...base, background: T.goldLight, color: T.ink, fontFamily: FONT, fontWeight: 900, fontSize: size / Math.max(2.2, t.length * 0.62)}}>{t}</div>
    );
  }
  return (
    <div style={{...base, background: e.tile === 'dark' ? '#121212' : '#ffffff', border: e.tile === 'dark' ? '2px solid rgba(255,255,255,0.12)' : `2px solid ${mix(T.ink, 0.08)}`}}>
      <Img src={staticFile(`logos/${t}.png`)} style={{width: '78%', height: '78%', objectFit: 'contain'}} />
    </div>
  );
};
