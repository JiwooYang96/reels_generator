// Brand tokens shared by every scene. A plan picks a palette with "palette": "<name>";
// PlanVideo applies it before any scene renders, so every component reads the same tokens from T.
export type Palette = {
  dark: string; // dark scene background
  darkCard: string; // cards on dark scenes
  cream: string; // light scene background
  card: string; // cards on light scenes
  gold: string; // accent for text/borders on light scenes (name kept for compatibility)
  goldLight: string; // accent fills and accent text on dark scenes
  ink: string; // main text on light scenes
  inkSoft: string; // secondary text on light scenes
  paper: string; // main text on dark scenes
  red: string; // down / bad
  green: string; // up / good
  darkGrid: string;
  creamGrid: string;
};

export const PALETTES: Record<string, Palette> = {
  // Warm luxury explainer, matching the reference reel.
  gold: {
    dark: '#0c0b0a', darkCard: '#17140f', cream: '#f5f0e6', card: '#fffdf8', gold: '#c98a1e', goldLight: '#f2c25b',
    ink: '#191510', inkSoft: '#8d857a', paper: '#f4efe6', red: '#e0483d', green: '#2fa36b',
    darkGrid: 'rgba(255,255,255,0.045)', creamGrid: 'rgba(60,45,20,0.06)',
  },
  // Trading-terminal look: near-black, amber accent, loud red/green. Reads as "markets" instantly.
  terminal: {
    dark: '#05070a', darkCard: '#0f141b', cream: '#eef2f5', card: '#ffffff', gold: '#c76f00', goldLight: '#ffad1f',
    ink: '#0b0f14', inkSoft: '#6b7785', paper: '#e8edf2', red: '#ff3b30', green: '#00d26a',
    darkGrid: 'rgba(255,173,31,0.05)', creamGrid: 'rgba(11,15,20,0.06)',
  },
  // Bold editorial: pure white/black with an electric-yellow highlighter. Maximum contrast on small screens.
  editorial: {
    dark: '#0d0d0d', darkCard: '#1b1b1b', cream: '#ffffff', card: '#ffffff', gold: '#111111', goldLight: '#ffe100',
    ink: '#0d0d0d', inkSoft: '#6e6e6e', paper: '#ffffff', red: '#ef2b2d', green: '#12b35d',
    darkGrid: 'rgba(255,255,255,0.04)', creamGrid: 'rgba(0,0,0,0.05)',
  },
  // Midnight blue with cyan: calm, "fintech app" feel.
  midnight: {
    dark: '#0a1024', darkCard: '#131b38', cream: '#eef1fb', card: '#ffffff', gold: '#1f6fd1', goldLight: '#4cc9f0',
    ink: '#0b1020', inkSoft: '#6b7394', paper: '#e9edfb', red: '#ff4d6d', green: '#2ec4a6',
    darkGrid: 'rgba(76,201,240,0.06)', creamGrid: 'rgba(11,16,32,0.06)',
  },
};

export type PaletteName = keyof typeof PALETTES;

// The live tokens. Starts as "gold"; applyPalette swaps them in place.
export const T: Palette = {...PALETTES.gold};
export const applyPalette = (name: string = 'gold') => {
  Object.assign(T, PALETTES[name] ?? PALETTES.gold);
};

// Mix a token with transparency, e.g. mix(T.ink, 0.06) for a faint line.
export const mix = (color: string, alpha: number) => `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;

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
