import type React from 'react';
import type {z} from 'zod';
import type {Theme} from '../theme';

// Sound/beat events a scene asks for, in frames relative to the scene start.
export type Ev =
  | {kind: 'impact'; at: number}
  | {kind: 'click'; at: number}
  | {kind: 'fall'; at: number}
  | {kind: 'ticks'; at: number; end: number};

export type SceneProps<P> = {p: P; dur: number; theme: Theme};

export type SceneDef<P = any> = {
  schema: z.ZodType<P, any>; // input may omit fields that have defaults
  Component: React.FC<SceneProps<P>>;
  events: (p: P, dur: number) => Ev[];
  defaultTheme: Theme;
  needsSource: boolean;
  summary: string; // one line for the catalogue
};
