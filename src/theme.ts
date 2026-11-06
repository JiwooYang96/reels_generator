// Brand tokens shared by every scene. Change the look of the whole channel here.
export const T = {
  dark: '#0c0b0a',
  darkCard: '#17140f',
  cream: '#f5f0e6',
  card: '#fffdf8',
  gold: '#c98a1e',
  goldLight: '#f2c25b',
  ink: '#191510',
  inkSoft: '#8d857a',
  paper: '#f4efe6',
  red: '#e0483d',
  green: '#2fa36b',
};

export const FONT = 'Inter, "Inter Display", sans-serif';

export const VIDEO = {width: 1080, height: 1920, fps: 30};

// Keep key content inside this box: platform buttons cover the right edge and the bottom.
export const SAFE = {x0: 90, x1: 950, y0: 180, y1: 1500};

// Standard card placement (inside the safe zone).
export const CARD = {x: 120, w: 820, top: 560};

export type Theme = 'dark' | 'light';
export type Tone = 'bad' | 'good' | 'gold';

export const toneColor = (tone: Tone) => (tone === 'bad' ? T.red : tone === 'good' ? T.green : T.goldLight);

// Font size that keeps one line of text inside maxWidth (approximate Inter heavy glyph width).
export const fit = (text: string, maxWidth: number, base: number, ratio = 0.62) =>
  Math.min(base, Math.floor(maxWidth / Math.max(1, text.length * ratio)));
