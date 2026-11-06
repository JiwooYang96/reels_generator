// Effects. Camera shake, particle burst and film grain are ported from
// React Video Editor's MIT "remotion-templates" (vendor/rve-templates), themed and made prop-driven.
import React from 'react';
import {AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Decaying shake that starts at frame `at` (port of camera-shake.tsx).
export const shakeAt = (frame: number, at: number, strength = 22, decay = 14) => {
  if (frame < at) return {x: 0, y: 0};
  const amp = interpolate(frame, [at, at + decay], [strength, 0], clamp);
  return {x: Math.sin(frame * 0.8) * amp, y: Math.cos(frame * 1.1) * amp};
};

export const Shake: React.FC<{at: number; strength?: number; children: React.ReactNode}> = ({at, strength, children}) => {
  const f = useCurrentFrame();
  const s = shakeAt(f, at, strength);
  return <AbsoluteFill style={{translate: `${s.x}px ${s.y}px`}}>{children}</AbsoluteFill>;
};

// Radial particle burst from (cx, cy) starting at `at` (port of particle-explosion.tsx).
export const Burst: React.FC<{at: number; cx: number; cy: number; colors: string[]; count?: number; reach?: number; seed?: string}> = ({
  at, cx, cy, colors, count = 120, reach = 520, seed = 'burst',
}) => {
  const f = useCurrentFrame() - at;
  const {fps} = useVideoConfig();
  if (f < 0) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: count}).map((_, i) => {
        const r = random(`${seed}-${i}`);
        const angle = (i / count) * Math.PI * 2 + r * 0.6 + f * 0.01;
        const dist = spring({frame: f, fps, from: 0, to: reach * (0.35 + r * 0.65), config: {mass: 0.4, damping: 11}});
        const size = 6 + random(`${seed}-s-${i}`) * 16;
        const opacity = interpolate(f, [0, 8, 45], [0, 1, 0], clamp);
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: cx + Math.cos(angle) * dist - size / 2, top: cy + Math.sin(angle) * dist - size / 2,
              width: size, height: size, borderRadius: i % 3 === 0 ? 3 : '50%', background: colors[i % colors.length],
              opacity, boxShadow: `0 0 12px ${colors[i % colors.length]}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Subtle animated film grain over the whole frame (port of noise-grain.tsx, coarse cells for speed).
export const Grain: React.FC<{opacity?: number}> = ({opacity = 1}) => {
  const f = useCurrentFrame();
  const cell = 24;
  const cols = Math.ceil(1080 / cell);
  const rows = Math.ceil(1920 / cell);
  const rects: React.ReactNode[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const i = r * cols + c;
      const v = ((i * 1237 + f * 7919) % 997) / 997;
      if (v > 0.55) rects.push(<rect key={i} x={c * cell} y={r * cell} width={cell} height={cell} fill="#fff" opacity={0.012 + (v - 0.55) * 0.05} />);
    }
  }
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity, mixBlendMode: 'overlay'}}>
      <svg width={1080} height={1920}>{rects}</svg>
    </AbsoluteFill>
  );
};

// Quick white flash on a cut.
export const Flash: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{background: '#fff', opacity: interpolate(f, [0, 2, 7], [0, 0.75, 0], clamp)}} />;
};
