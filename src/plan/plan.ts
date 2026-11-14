// The plan format Claude writes for each video, plus validation and timing helpers.
// Used by the PlanVideo composition (browser) and scripts/prepare.ts (Node).
import {z} from 'zod';
import {BRAND} from '../brand';
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
  caption: z.array(wordSchema).default([]), // only endCard may leave it empty
  source: z.string().optional(),
  // What the narrator says over this scene. Defaults to the caption words.
  voice: z.string().optional(),
  props: z.record(z.string(), z.any()),
});

export const planSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id must be lowercase letters, digits and dashes'),
  title: z.string().optional(),
  structure: z.string().optional(),
  hookFamily: z.string().optional(),
  scenes: z.array(sceneSchema).min(2).max(12),
  audio: z.string().optional(),
  // Filled in by scripts/prepare.ts from the ElevenLabs narration (scripts/voice.py): one clip per scene.
  voiceover: z.array(z.object({src: z.string(), at: z.number().int().nonnegative()})).optional(),
  // The Instagram post for this reel (daily reels).
  post: z.object({caption: z.string().min(10)}).optional(),
  // Background music (scripts/music.py): tense for a fall, lift for a rise, neutral otherwise, none to leave it out.
  music: z.enum(['tense', 'lift', 'neutral', 'none']).default('tense'),
  grain: z.boolean().default(true),
  handle: z.string().regex(/^@\w+$/).default(BRAND.handle),
  palette: z.enum(['broadsheet', 'gold', 'terminal', 'editorial', 'midnight']).default('broadsheet'),
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

// Words that make a finance video look like hype or advice; trust is the product, so they never appear.
// The rehook: the first of scenes 2-3 whose line opens with a turn ("But...", "Not..."). The cut into it tears
// the page and gets the paper-rip sound; scripts/hookgate.py requires one.
export const REHOOK = /^\s*(but|not|turns out|here'?s|the catch|except|instead|yet|and it wasn'?t|only)\b/i;
export const rehookIndex = (plan: Plan): number | null => {
  const i = plan.scenes.slice(1, 3).findIndex((s) => REHOOK.test(s.voice ?? ''));
  return i < 0 ? null : i + 1;
};

export const HYPE = [
  'insane', 'crazy', 'shocking', "you won't believe", 'to the moon', 'guaranteed', 'must buy', 'buy now',
  'sell now', 'explode', 'skyrocket', 'secret', 'get rich', 'millionaire', 'act now', 'free money', 'can\'t lose',
  'next nvidia', '100x', 'huge gains', 'easy money',
];

// Checks a human editor would make before rendering. Returns problems; empty = good to render.
export const checkPlan = (plan: Plan): string[] => {
  const problems: string[] = [];
  const total = totalFrames(plan) / VIDEO.fps;
  if (total < 6 || total > 60) problems.push(`total length ${total.toFixed(1)} s is outside 6-60 s`);
  if (!plan.scenes[0].type.startsWith('open.')) problems.push('scene 1 must be an opening (open.*)');
  if (plan.scenes[0].seconds > 3.5) problems.push('the opening should be 3.5 s or shorter');
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
    if (!s.caption.length && s.type !== 'endCard') problems.push(`${n}: needs a caption`);
    const keys = s.caption.filter((w) => w.key).length;
    if (keys === 0 && s.caption.length) problems.push(`${n}: caption needs one boxed keyword (key: true)`);
    if (keys > 2) problems.push(`${n}: ${keys} boxed keywords; max 2`);
    const wps = s.caption.length / s.seconds;
    if (wps > 3.2) problems.push(`${n}: ${wps.toFixed(1)} words per second is too fast to read; max 3.2`);
    // Narration: a calm newsreader pace (a line that's too long makes the scene drag once it stretches to fit).
    if (s.voice) {
      const vw = s.voice.trim().split(/\s+/).length;
      if (vw / s.seconds > 4.2) problems.push(`${n}: voice line has ${vw} words for ${s.seconds} s; plan about 3.3 words per second`);
    }
    const said = `${s.voice ?? ''} ${s.caption.map((w) => w.t).join(' ')}`.toLowerCase();
    for (const h of HYPE) if (said.includes(h)) problems.push(`${n}: "${h}" reads as hype or advice; say what happened instead`);
  });
  // Narration is all or nothing, and the hook line must land inside the opening.
  const voiced = plan.scenes.filter((s) => s.voice).length;
  if (voiced && voiced < plan.scenes.length) problems.push(`${plan.scenes.length - voiced} scene(s) have no "voice" line; narrate every scene or none`);
  const hookWords = plan.scenes[0].voice ? plan.scenes[0].voice.trim().split(/\s+/).length : 0;
  if (hookWords > 11) problems.push(`opening voice line has ${hookWords} words; the hook must land in about 3 s (max 11 words)`);
  if (plan.post && !/sources?:/i.test(plan.post.caption)) problems.push('post.caption needs a "Sources:" list');
  // Channel: the closing scene must send viewers to the account.
  const last = plan.scenes[plan.scenes.length - 1];
  const lastText = JSON.stringify(last.props) + JSON.stringify(last.caption);
  const defaultsToHandle = (last.type === 'calendarCta' && !('cta' in last.props)) || last.type === 'endCard';
  if (!defaultsToHandle && !lastText.includes(plan.handle)) problems.push(`last scene: end with a follow CTA that names ${plan.handle}`);
  // Daily reels (they carry an Instagram post) close on the promo end card and run 28-45 s.
  if (plan.post) {
    if (last.type !== 'endCard') problems.push('daily reels must end with an endCard scene (see docs/STYLE.md "End card")');
    if (plan.scenes.filter((s) => s.type === 'endCard').length > 1) problems.push('only one endCard, at the end');
    if (total < 28 || total > 45) problems.push(`daily reel is ${total.toFixed(1)} s; plan 30-40 s (allowed 28-45)`);
  }

  // Balance: numbers hook, explanations inform. Most scenes carry a number; longer videos explain at least once.
  const body = plan.scenes.slice(1).filter((s) => s.type !== 'chapters');
  const withNumber = body.filter((s) => /\d/.test(JSON.stringify(s.props) + JSON.stringify(s.caption))).length;
  if (body.length && withNumber / body.length < 0.7) problems.push(`only ${withNumber} of ${body.length} scenes show a number; aim for at least 70% so every beat has a hook`);
  const explains = plan.scenes.filter((s) => ['causeChain', 'headline', 'timeline'].includes(s.type)).length;
  if (plan.scenes.length >= 5 && explains === 0) problems.push('no explanation scene: add a causeChain (or headline/timeline) so the video informs, not just teases');
  plan.scenes.forEach((s, i) => {
    if (s.type === 'causeChain' && !s.props.stat) problems.push(`scene ${i + 1} (causeChain): add a stat (one big sourced number) to the reason`);
  });
  return problems;
};
