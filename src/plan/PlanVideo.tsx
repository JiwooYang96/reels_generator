// Renders any plan: background, scene visual, caption and source line per scene,
// flashes on cuts, film grain, and the generated sound track.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {Flash, Grain} from '../fx';
import {Background, Caption, Handle, Source} from '../kit';
import {SCENES} from '../scenes/registry';
import {T, applyPalette} from '../theme';
import {type Plan, resolvePlan} from './plan';

export const PlanVideo: React.FC<Plan> = (plan) => {
  // Swap the palette in before any scene reads the tokens.
  applyPalette(plan.palette);
  const scenes = resolvePlan(plan);
  return (
    <AbsoluteFill style={{background: T.dark}}>
      {scenes.map((s, i) => {
        const def = SCENES[s.type];
        const Visual = def.Component;
        return (
          <Sequence key={i} from={s.from} durationInFrames={s.dur} name={`${i + 1} ${s.type}`}>
            <Background theme={s.theme} />
            <Visual p={s.props} dur={s.dur} theme={s.theme} />
            <Caption theme={s.theme} words={s.caption.map((w) => ({...w, at: w.at ?? 0}))} />
            {s.source ? <Source theme={s.theme} text={`Source: ${s.source}`} /> : null}
            <Handle theme={s.theme} text={plan.handle} />
          </Sequence>
        );
      })}
      {scenes.slice(1).map((s) => (
        <Sequence key={`flash-${s.from}`} from={Math.max(0, s.from - 2)} durationInFrames={8}>
          <Flash />
        </Sequence>
      ))}
      {plan.grain ? <Grain /> : null}
      {plan.audio ? <Audio src={staticFile(plan.audio)} /> : null}
    </AbsoluteFill>
  );
};
