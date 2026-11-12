// Validates a plan, prints editor-style problems, and writes the render props + sound events.
// Usage: npx tsx scripts/prepare.ts plans/<id>.json [--force]
import fs from 'node:fs';
import path from 'node:path';
import {checkPlan, planEvents, planSchema, resolvePlan, totalFrames} from '../src/plan/plan';

const file = process.argv[2];
const force = process.argv.includes('--force');
if (!file) {
  console.error('usage: npx tsx scripts/prepare.ts plans/<id>.json [--force]');
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const parsed = planSchema.safeParse(raw);
if (!parsed.success) {
  console.error('PLAN INVALID:');
  for (const i of parsed.error.issues) console.error(`  - ${i.path.join('.')}: ${i.message}`);
  process.exit(1);
}
const plan = parsed.data;

const problems = checkPlan(plan);
if (problems.length) {
  console.error(`PLAN CHECK: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  if (!force) process.exit(1);
}

// Narration (after the pacing check, which judges the planned timing) (scripts/voice.py writes out/<id>/vo.json): stretch each scene to fit its line, then place the clips.
const voPath = path.join('out', plan.id, 'vo.json');
const vo: {i: number; src: string; dur: number}[] = fs.existsSync(voPath) ? JSON.parse(fs.readFileSync(voPath, 'utf8')) : [];
for (const v of vo) {
  const sc = plan.scenes[v.i];
  if (sc) sc.seconds = Math.min(8, Math.max(sc.seconds, +(v.dur + 0.45).toFixed(2)));
}

const scenes = resolvePlan(plan);
const {events, cuts} = planEvents(scenes);
const sec = (f: number) => +(f / 30).toFixed(3);
const sfx = {
  duration: totalFrames(plan) / 30,
  cuts: cuts.map(sec),
  impacts: events.filter((e) => e.kind === 'impact').map((e) => sec(e.at)),
  clicks: events.filter((e) => e.kind === 'click').map((e) => sec(e.at)),
  fall: events.filter((e) => e.kind === 'fall').map((e) => sec(e.at)),
  ticks: events.flatMap((e) => (e.kind === 'ticks' ? [[sec(e.at), sec(e.end), 0.06]] : [])),
};

const outDir = path.join('out', plan.id);
fs.mkdirSync(outDir, {recursive: true});
const voiceover = vo
  .filter((v) => scenes[v.i])
  .map((v) => ({src: v.src, at: scenes[v.i].from + 5}));
(sfx as Record<string, unknown>).voice = voiceover.length > 0;
fs.writeFileSync(path.join(outDir, 'sfx.json'), JSON.stringify(sfx, null, 2));
fs.writeFileSync(path.join(outDir, 'props.json'), JSON.stringify({...plan, audio: `sfx/${plan.id}.wav`, voiceover}, null, 2));

console.log(`plan ok: ${plan.id}, ${scenes.length} scenes, ${sfx.duration.toFixed(1)} s`);
for (const s of scenes) console.log(`  ${String(s.from).padStart(4)}f  ${s.type.padEnd(16)} ${(s.dur / 30).toFixed(1)} s  ${s.theme}`);
