// Broadsheet fonts (all SIL Open Font License), bundled in public/fonts so renders need no network.
// Instrument Serif: headlines and big numbers. Source Serif 4: body. Source Sans 3: labels.
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

const FILES = [
  ['Instrument Serif', 'instrument-serif-latin-400-normal', '400', 'normal'],
  ['Instrument Serif', 'instrument-serif-latin-400-italic', '400', 'italic'],
  ['Source Serif 4', 'source-serif-4-latin-400-normal', '400', 'normal'],
  ['Source Serif 4', 'source-serif-4-latin-400-italic', '400', 'italic'],
  ['Source Serif 4', 'source-serif-4-latin-700-normal', '700', 'normal'],
  ['Source Sans 3', 'source-sans-3-latin-600-normal', '600', 'normal'],
  ['Source Sans 3', 'source-sans-3-latin-700-normal', '700', 'normal'],
] as const;

// Only in the browser: scripts/prepare.ts imports the theme under Node, where there is nothing to load.
for (const [family, file, weight, style] of typeof document === 'undefined' ? [] : FILES) {
  loadFont({family, url: staticFile(`fonts/${file}.woff2`), weight, style});
}

// Quote family names: an unquoted word starting with a digit ("4", "3") is invalid CSS.
export const SERIF_DISPLAY = '"Instrument Serif", Georgia, serif';
export const SERIF_BODY = '"Source Serif 4", Georgia, serif';
export const SANS_LABEL = '"Source Sans 3", "Helvetica Neue", Arial, sans-serif';
