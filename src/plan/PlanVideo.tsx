// Renders any plan: background, scene visual, caption and source line per scene,
// flashes on cuts, film grain, and the generated sound track.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Flash, Grain} from '../fx';
import {Background, Caption, Handle, Source} from '../kit';
import {SCENES} from '../scenes/registry';
import {T, applyPalette} from '../theme';
import {type Plan, rehookIndex, resolvePlan} from './plan';
import {paperTear} from '../vendor/remocn/paper-tear';

// The rehook cut tears the page (remocn Paper Tear): the hook's scene rips apart onto the twist.
export const TEAR = 24;
const tear = paperTear({edgeColor: '#f1ead9', roughness: 0.55, seed: 11, impact: 0.8});
const Torn: React.FC<{start: number; dir: 'entering' | 'exiting'; children: React.ReactNode}> = ({start, dir, children}) => {
  const f = useCurrentFrame();
  const p = Math.min(1, Math.max(0, (f - start) / TEAR));
  const C = tear.component;
  return <C presentationProgress={p} presentationDirection={dir} passedProps={tear.props}>{children}</C>;
};

// Frame 0 must already show the whole hook: viewers decide to skip before anything finishes animating in, and a
// blank first frame looks like a video that hasn't started. So the opening scene plays from OPEN_HEAD frames in
// (its entrance already done) with a slow camera push for motion, and its caption words are all up at once.
export const OPEN_HEAD = 36;
const Push: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const f = useCurrentFrame();
  const z = 1.06 - 0.06 * Math.min(1, f / Math.max(1, dur));
  return <AbsoluteFill style={{scale: `${z}`}}>{children}</AbsoluteFill>;
};

export const PlanVideo: React.FC<Plan> = (plan) => {
  // Swap the palette in before any scene reads the tokens.
  applyPalette(plan.palette);
  const scenes = resolvePlan(plan);
  const k = rehookIndex(plan);
  return (
    <AbsoluteFill style={{background: T.dark}}>
      {scenes.map((s, i) => {
        const def = SCENES[s.type];
        const Visual = def.Component;
        const open = i === 0;
        const visual = <Visual p={s.props} dur={s.dur} theme={s.theme} />;
        const body = (
          <AbsoluteFill>
            <Background theme={s.theme} />
            {open ? (
              <Push dur={s.dur}>
                <Sequence from={-OPEN_HEAD} layout="none">{visual}</Sequence>
              </Push>
            ) : visual}
            {s.caption.length ? <Caption theme={s.theme} words={s.caption.map((w) => ({...w, at: open ? -OPEN_HEAD : w.at ?? 0}))} /> : null}
            {s.source ? <Source theme={s.theme} text={`Source: ${s.source}`} /> : null}
            <Handle theme={s.theme} text={plan.handle} />
          </AbsoluteFill>
        );
        // The scene before the rehook stays up for the tear, on top; the rehook scene is punched in under it.
        const outgoing = k !== null && i === k - 1;
        const incoming = k !== null && i === k;
        return (
          <Sequence key={i} from={s.from} durationInFrames={s.dur + (outgoing ? TEAR : 0)} name={`${i + 1} ${s.type}`} style={outgoing ? {zIndex: 2} : undefined}>
            {outgoing ? <Torn start={s.dur} dir="exiting">{body}</Torn> : incoming ? <Torn start={0} dir="entering">{body}</Torn> : body}
          </Sequence>
        );
      })}
      {scenes.slice(1).filter((_, j) => j + 1 !== k).map((s) => (
        <Sequence key={`flash-${s.from}`} from={Math.max(0, s.from - 2)} durationInFrames={8}>
          <Flash />
        </Sequence>
      ))}
      {plan.grain ? <Grain /> : null}
      {plan.audio ? <Audio src={staticFile(plan.audio)} volume={plan.voiceover?.length ? 0.6 : 1} /> : null}
      {(plan.voiceover ?? []).map((v) => (
        <Sequence key={v.src} from={v.at} name={`voice ${v.src}`}>
          <Audio src={staticFile(v.src)} volume={1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
