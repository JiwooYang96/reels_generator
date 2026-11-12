import type React from 'react';
import {SANS_LABEL, SERIF_DISPLAY} from './fonts';

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
  // Optional newspaper look: paper texture backgrounds, serif headlines, highlighter keywords.
  broadsheet?: boolean;
  blue?: string; // extra accent for charts and labels (broadsheet)
};

export const PALETTES: Record<string, Palette> = {
  // Channel default. Printed-newspaper look with colour: paper and ink, cobalt and highlighter-yellow
  // accents, loud red/green for moves, deep navy for dark scenes.
  broadsheet: {
    dark: '#14233b', darkCard: '#1c2f4d', cream: '#f1ead9', card: '#fbf7ee', gold: '#1d4f91', goldLight: '#ffd23f',
    ink: '#16130f', inkSoft: '#5d564b', paper: '#f6f0e2', red: '#c8372d', green: '#1f8a57',
    darkGrid: 'rgba(246,240,226,0.05)', creamGrid: 'rgba(22,19,15,0.05)', broadsheet: true, blue: '#1d4f91',
  },
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

export const DEFAULT_PALETTE = 'broadsheet';

// Body/label font and heavy display style. These are live bindings: applyPalette reassigns them, and
// components read them at render time. Broadsheet swaps Inter for serif headlines and sans labels.
const INTER = 'Inter, "Inter Display", sans-serif';
export let FONT = SANS_LABEL;
// Spread into a style for big numbers and headlines: {...HEAVY}.
export let HEAVY: React.CSSProperties = {fontFamily: SERIF_DISPLAY, fontWeight: 400, lineHeight: 1};
export let DISPLAY = SERIF_DISPLAY;

// The live tokens. Starts as the channel default; applyPalette swaps them in place.
export const T: Palette = {...PALETTES[DEFAULT_PALETTE]};
export const applyPalette = (name: string = DEFAULT_PALETTE) => {
  const p = PALETTES[name] ?? PALETTES[DEFAULT_PALETTE];
  for (const k of Object.keys(T)) delete (T as Record<string, unknown>)[k];
  Object.assign(T, p);
  FONT = p.broadsheet ? SANS_LABEL : INTER;
  DISPLAY = p.broadsheet ? SERIF_DISPLAY : INTER;
  HEAVY = p.broadsheet ? {fontFamily: SERIF_DISPLAY, fontWeight: 400, lineHeight: 1} : {fontWeight: 900};
};

// Mix a token with transparency, e.g. mix(T.ink, 0.06) for a faint line.
export const mix = (color: string, alpha: number) => `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;


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
