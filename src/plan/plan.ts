// The plan format Claude writes for each video, plus validation and timing helpers.
// Used by the PlanVideo composition (browser) and scripts/prepare.ts (Node).
import {z} from 'zod';
import {hasLogo} from '../logo';
import {SCENES} from '../scenes/registry';
import type {Ev} from '../scenes/types';
import {VIDEO} from '../theme';

export const wordSchema = z.object({t: z.string().min(1), key: z.boolean().optional(), br: z.boolean().optional(), at: z.number().int().nonnegative().optional()});
export type Word = z.infer<typeof wordSchema>;

export const sceneSchema = z.object({
  type: z.string(),
  seconds: z.number().min(1).max(8),
  theme: z.enum(['dark', 'light']).optional(),
  caption: z.array(wordSchema).min(1),
  source: z.string().optional(),
  props: z.record(z.string(), z.any()),
});

export const planSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id must be lowercase letters, digits and dashes'),
  title: z.string().optional(),
  structure: z.string().optional(),
  hookFamily: z.string().optional(),
  scenes: z.array(sceneSchema).min(2).max(12),
  audio: z.string().optional(),
  grain: z.boolean().default(true),
});
export type Plan = z.infer<typeof planSchema>;

export type ResolvedScene = {type: string; from: number; dur: number; theme: 'dark' | 'light'; caption: Word[]; source?: string; props: any};

// Caption timing: one word every `step` frames, a short pause before key words,
// squeezed so the whole caption lands within the first 60% of the scene.
export const timeCaption = (words: Word[], dur: number): Word[] => {
  const pauses = words.filter((w, i) => w.key && i > 0).length;
  const budget = Math.max(8, Math.floor(dur * 0.6));
  const step = Math.max(3, Math.min(5, Math.floor((budget - pauses * 3) / Math.max(1, words.length))));
  let t = 0;
  return words.map((w, i) => {
    if (w.at !== undefined) {
      t = w.at;
      return w;
    }
    if (w.key && i > 0) t += 3;
    const out = {...w, at: t};
    t += step;
    return out;
  });
};

export const resolvePlan = (plan: Plan): ResolvedScene[] => {
  let from = 0;
  return plan.scenes.map((s) => {
    const def = SCENES[s.type];
    const dur = Math.round(s.seconds * VIDEO.fps);
    const props = def ? def.schema.parse(s.props) : s.props;
    const r: ResolvedScene = {type: s.type, from, dur, theme: s.theme ?? def?.defaultTheme ?? 'dark', caption: timeCaption(s.caption, dur), source: s.source, props};
    from += dur;
    return r;
  });
};

export const totalFrames = (plan: Plan) => plan.scenes.reduce((n, s) => n + Math.round(s.seconds * VIDEO.fps), 0);

// Absolute-frame sound events for the whole video: every scene's own events, plus the cut frames.
export const planEvents = (scenes: ResolvedScene[]): {events: Ev[]; cuts: number[]} => {
  const events: Ev[] = [];
  scenes.forEach((s) => {
    for (const e of SCENES[s.type].events(s.props, s.dur)) {
      events.push(e.kind === 'ticks' ? {...e, at: e.at + s.from, end: e.end + s.from} : {...e, at: e.at + s.from});
    }
  });
  return {events, cuts: scenes.slice(1).map((s) => s.from)};
};

// Every ticker used as a logo anywhere in a scene's props.
export const logoTickers = (props: unknown): string[] => {
  if (Array.isArray(props)) return props.flatMap(logoTickers);
  if (props && typeof props === 'object') {
    return Object.entries(props as Record<string, unknown>).flatMap(([k, v]) => ((k === 'logo' || k === 'ticker') && typeof v === 'string' ? [v] : logoTickers(v)));
  }
  return [];
};

// Checks a human editor would make before rendering. Returns problems; empty = good to render.
export const checkPlan = (plan: Plan): string[] => {
  const problems: string[] = [];
  const total = totalFrames(plan) / VIDEO.fps;
  if (total < 6 || total > 60) problems.push(`total length ${total.toFixed(1)} s is outside 6-60 s`);
  if (!plan.scenes[0].type.startsWith('open.')) problems.push('scene 1 must be an opening (open.*)');
  if (plan.scenes[0].seconds > 3) problems.push('the opening should be 3 s or shorter');
  plan.scenes.forEach((s, i) => {
    const n = `scene ${i + 1} (${s.type})`;
    const def = SCENES[s.type];
    if (!def) {
      problems.push(`${n}: unknown type; see docs/SCENES.md`);
      return;
    }
    const parsed = def.schema.safeParse(s.props);
    if (!parsed.success) problems.push(`${n}: ${parsed.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ')}`);
    if (def.needsSource && !s.source) problems.push(`${n}: data scenes need a "source" line`);
    const lines: string[] = [''];
    s.caption.forEach((w) => {
      if (w.br) lines.push('');
      lines[lines.length - 1] += (lines[lines.length - 1] ? ' ' : '') + w.t;
    });
    if (lines.length > 2) problems.push(`${n}: caption has ${lines.length} lines; max 2`);
    lines.forEach((l) => {
      if (l.length > 24) problems.push(`${n}: caption line "${l}" is ${l.length} chars; max 24`);
    });
    for (const t of logoTickers(s.props)) {
      if (!hasLogo(t)) problems.push(`${n}: no logo for ${t}; run "python3 scripts/logos.py add ${t}" or remove it`);
    }
    const keys = s.caption.filter((w) => w.key).length;
    if (keys === 0) problems.push(`${n}: caption needs one boxed keyword (key: true)`);
    if (keys > 2) problems.push(`${n}: ${keys} boxed keywords; max 2`);
    const wps = s.caption.length / s.seconds;
    if (wps > 3.2) problems.push(`${n}: ${wps.toFixed(1)} words per second is too fast to read; max 3.2`);
  });
  return problems;
};
