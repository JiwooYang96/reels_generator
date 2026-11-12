// Broadsheet style sample: a printed front page that tears open onto a chart page.
// 7 s, 1080x1920. Figures are invented for the style test and labelled as a sample.
//
// Paper: still frames rendered from Paper Shaders' PaperTexture (Apache-2.0), see PaperStill.tsx.
// Type: Instrument Serif (titles), Source Serif 4 (body), Source Sans 3 (labels), all OFL.
import React from 'react';
import {AbsoluteFill, Easing, Img, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const INK = '#16130f';
const SOFT = '#5d564b';
const GOLD = '#9a6a12';
const RED = '#9e2016';
const HAIR = 'rgba(22,19,15,0.35)';

const fam = (name: string, fallback: string) => `'${name}', ${fallback}`;
const DISPLAY = fam('Instrument Serif', 'Georgia, serif');
const BODY = fam('Source Serif 4', 'Georgia, serif');
const LABEL = fam('Source Sans 3', 'Helvetica, sans-serif');

import '../fonts';

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const prog = (f: number, a: number, len: number, e = ease) =>
  interpolate(f, [a, a + len], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e});
const rise = (f: number, a: number, len = 12, dist = 34) => {
  const p = prog(f, a, len);
  return {opacity: p, transform: `translateY(${(1 - p) * dist}px)`};
};
// Ink that settles onto the page: fades in from a slight blur, like a print coming up.
const settle = (f: number, a: number, len = 14) => {
  const p = prog(f, a, len);
  return {opacity: p, filter: `blur(${(1 - p) * 6}px)`, transform: `translateY(${(1 - p) * 18}px)`};
};

// ---------- surfaces ----------

const Paper: React.FC<{src: string}> = ({src}) => {
  const f = useCurrentFrame();
  const s = 1.07 - f * 0.00012;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Img src={staticFile(`textures/${src}`)} style={{
        width: '100%', height: '100%', objectFit: 'cover',
        transform: `scale(${s}) translate(${Math.sin(f / 60) * 6}px, ${f * 0.05}px)`,
        filter: 'brightness(1.16) contrast(0.9) saturate(0.88)',
      }} />
    </AbsoluteFill>
  );
};

// Film grain that changes every other frame, plus a soft vignette.
const Grain: React.FC = () => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2) % 24;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width="100%" height="100%" style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.5}}>
        <filter id={`g${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.24  0 0 0 0.16 0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${seed})`} />
      </svg>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, transparent 58%, rgba(45,32,15,0.28) 100%)'}} />
    </AbsoluteFill>
  );
};

// Everything printed sits in a multiply layer so the paper's folds show through the ink.
const Ink: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{mixBlendMode: 'multiply'}}>{children}</AbsoluteFill>
);

const Rule: React.FC<{f: number; at: number; w?: number; double?: boolean}> = ({f, at, w = 2, double}) => (
  <div style={{width: `${prog(f, at, 14) * 100}%`, margin: '0 auto'}}>
    <div style={{borderTop: `${w}px solid ${INK}`}} />
    {double ? <div style={{borderTop: `1px solid ${INK}`, marginTop: 6}} /> : null}
  </div>
);

// Compact masthead: brand and date stay readable, but leave the screen to the story.
const Masthead: React.FC<{f: number}> = ({f}) => (
  <div style={{padding: '176px 70px 0'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: LABEL, fontWeight: 700, fontSize: 30,
      letterSpacing: 2, color: SOFT, textTransform: 'uppercase'}}>
      <span>Fri, Nov 13</span>
      <span style={{textTransform: 'none', letterSpacing: 0}}>@fivebeforemonday</span>
    </div>
    <div style={{margin: '12px 0 2px'}}><Rule f={f} at={0} w={3} /></div>
    <div style={{fontFamily: DISPLAY, fontSize: 104, lineHeight: 1, textAlign: 'center', color: INK, letterSpacing: -1,
      padding: '8px 0 4px'}}>Five Before Monday</div>
    <Rule f={f} at={0} w={2} double />
  </div>
);

// A figure that lands like a rubber stamp: overshoot, a tiny skew, ink spreading for a frame or two.
const stamp = (f: number, a: number) => {
  const p = prog(f, a, 9, Easing.out(Easing.back(1.6)));
  const ink = prog(f, a, 5);
  return {
    opacity: ink, transform: `scale(${1.5 - 0.5 * p}) rotate(${(1 - p) * -3}deg)`,
    filter: `blur(${(1 - ink) * 8}px)`,
  };
};

// Red marker underline that swipes in under a word.
const Underline: React.FC<{f: number; at: number; width: number}> = ({f, at, width}) => {
  const p = prog(f, at, 8, Easing.out(Easing.cubic));
  return (
    <svg width={width} height={44} style={{display: 'block', overflow: 'visible'}}>
      <path d={`M6 26 C ${width * 0.3} 12, ${width * 0.6} 34, ${width - 8} 18`} fill="none" stroke={RED} strokeWidth={16}
        strokeLinecap="round" strokeDasharray={width * 1.2} strokeDashoffset={width * 1.2 * (1 - p)} opacity={0.85} />
    </svg>
  );
};

const Kicker: React.FC<{f: number; at: number; children: React.ReactNode}> = ({f, at, children}) => (
  <div style={{fontFamily: LABEL, fontWeight: 700, fontSize: 36, letterSpacing: 5, color: GOLD,
    textTransform: 'uppercase', ...rise(f, at, 8, 14)}}>{children}</div>
);

// A page that sits slightly loose on the desk: a slow drift and a hair of rotation.
const Sheet: React.FC<{children: React.ReactNode; paper: string}> = ({children, paper}) => {
  const f = useCurrentFrame();
  const r = Math.sin(f / 45) * 0.18;
  const push = interpolate(f, [0, 130], [1.035, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
  return (
    <AbsoluteFill style={{background: '#2b241b'}}>
      <AbsoluteFill style={{transform: `scale(${push}) rotate(${r}deg)`}}>
        <Paper src={paper} />
        <Ink>{children}</Ink>
        <Grain />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- scene A: the shock ----------

const ShockPage: React.FC = () => {
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [2, 16], [0, 400], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}));
  return (
    <Sheet paper="paper-front.png">
      <Masthead f={f} />
      <div style={{padding: '46px 70px 0'}}>
        <Kicker f={f} at={0}>Chip stocks · Thursday</Kicker>
        <div style={{transformOrigin: '0% 50%', ...stamp(f, 1)}}>
          <div style={{fontFamily: DISPLAY, fontSize: 450, lineHeight: 0.86, color: INK, letterSpacing: -9, marginTop: 18}}>
            ${n}
          </div>
          <div style={{fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 190, lineHeight: 0.9, color: INK, marginTop: -6,
            marginLeft: 8}}>billion</div>
        </div>
        <div style={{marginTop: 6, marginLeft: 4}}><Underline f={f} at={14} width={620} /></div>
        <div style={{fontFamily: DISPLAY, fontSize: 104, lineHeight: 1, color: INK, marginTop: 22, ...rise(f, 18, 10, 30)}}>
          wiped off chip stocks<br />in a single day
        </div>
        <div style={{fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 72, color: RED, marginTop: 26, ...rise(f, 34, 10, 20)}}>
          Their worst session since April.
        </div>
      </div>
    </Sheet>
  );
};

// ---------- scene B: the biggest loser ----------

const DAYS = [
  {d: 'Fri', v: 202.4}, {d: 'Mon', v: 199.0}, {d: 'Tue', v: 197.2}, {d: 'Wed', v: 195.6}, {d: 'Thu', v: 180.3}, {d: 'Fri', v: 186.6},
];

const LoserPage: React.FC = () => {
  const f = useCurrentFrame();
  const W = 940, H = 640, padL = 30, padR = 60, padT = 40, padB = 80;
  const lo = 177, hi = 205;
  const x = (i: number) => padL + (i * (W - padL - padR)) / (DAYS.length - 1);
  const y = (v: number) => padT + ((hi - v) / (hi - lo)) * (H - padT - padB);
  const path = DAYS.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.v)}`).join(' ');
  const draw = prog(f, 10, 34, Easing.inOut(Easing.cubic));
  const len = 1300;
  const thu = 4;
  const note = prog(f, 38, 8);
  return (
    <Sheet paper="paper-chart.png">
      <Masthead f={60} />
      <div style={{padding: '46px 70px 0'}}>
        <Kicker f={f} at={0}>The biggest loser</Kicker>
        <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 10}}>
          <div style={{fontFamily: DISPLAY, fontSize: 168, lineHeight: 1, color: INK, letterSpacing: -3, ...rise(f, 2, 10, 40)}}>Nvidia</div>
          <div style={{fontFamily: DISPLAY, fontSize: 200, lineHeight: 1, color: RED, letterSpacing: -5, transformOrigin: '80% 70%',
            ...stamp(f, 6)}}>−7.8%</div>
        </div>
        <div style={{fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 62, lineHeight: 1.05, color: SOFT, marginTop: 6, ...rise(f, 8, 10, 16)}}>
          on Thursday alone
        </div>
      </div>
      <svg width={W} height={H} style={{margin: '24px 70px 0', overflow: 'visible'}}>
        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke={INK} strokeWidth={4} />
        {DAYS.map((p, i) => (
          <text key={i} x={x(i)} y={H - padB + 54} textAnchor="middle" fontFamily={LABEL} fontWeight={700} fontSize={38}
            letterSpacing={1} fill={i === thu ? RED : SOFT}>{p.d.toUpperCase()}</text>
        ))}
        <path d={path} fill="none" stroke={INK} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
        {draw > 0.79 ? <circle cx={x(thu)} cy={y(DAYS[thu].v)} r={24 * prog(f, 36, 6, Easing.out(Easing.back(2)))} fill={RED} /> : null}
        <g opacity={note}>
          <text x={x(thu) - 40} y={y(DAYS[thu].v) + 10} textAnchor="end" fontFamily={DISPLAY} fontSize={84} fill={RED}>Thursday</text>
        </g>
      </svg>
      <div style={{margin: '18px 70px 0', fontFamily: LABEL, fontWeight: 600, fontSize: 28, color: SOFT, letterSpacing: 1}}>
        SAMPLE · illustrative figures for a style test
      </div>
    </Sheet>
  );
};

// ---------- scene C: the open question ----------

const QuestionPage: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Sheet paper="paper-front.png">
      <Masthead f={60} />
      <div style={{padding: '70px 70px 0'}}>
        <div style={{fontFamily: DISPLAY, fontSize: 230, lineHeight: 0.92, color: INK, letterSpacing: -4, transformOrigin: '0% 50%', ...stamp(f, 0)}}>
          So why<br />did it fall?
        </div>
        <div style={{marginTop: 26}}><Rule f={f} at={8} w={4} /></div>
        <div style={{fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 104, lineHeight: 1.02, color: INK, marginTop: 30,
          ...rise(f, 10, 10, 24)}}>
          3 reasons, in<br />Sunday's report <span style={{color: GOLD, fontStyle: 'normal'}}>&#8594;</span>
        </div>
        <div style={{fontFamily: LABEL, fontWeight: 700, fontSize: 52, lineHeight: 1.25, color: INK, marginTop: 60, ...rise(f, 18, 10, 16)}}>
          Follow <span style={{color: GOLD}}>@fivebeforemonday</span><br />for the daily move
        </div>
      </div>
    </Sheet>
  );
};

// Ink wipe: the next page slides in from the right edge with a hard shadow, like a page laid on top.
const LayOn: React.FC<{start: number; children: React.ReactNode}> = ({start, children}) => {
  const f = useCurrentFrame();
  const p = prog(f, start, 10, Easing.out(Easing.cubic));
  return (
    <AbsoluteFill style={{transform: `translateX(${(1 - p) * 110}%) rotate(${(1 - p) * 4}deg)`, transformOrigin: '0% 100%',
      filter: 'drop-shadow(-18px 0 28px rgba(30,20,8,0.45))'}}>{children}</AbsoluteFill>
  );
};

// ---------- the paper rip ----------

const tearEdge = (seed: string, w: number, mid: number, amp: number, offset = 0) => {
  const pts: [number, number][] = [];
  for (let xx = -20, i = 0; xx <= w + 20; xx += 9, i++) {
    const wave = Math.sin(xx / 190 + random(`${seed}-p`) * 6) * amp * 0.9 + Math.sin(xx / 53 + 1.3) * amp * 0.3;
    const tooth = (random(`${seed}-${i}`) - 0.5) * amp * (random(`${seed}-k${i}`) > 0.85 ? 1.6 : 0.7);
    pts.push([xx, mid + wave + tooth + offset]);
  }
  return pts;
};
const toPath = (edge: [number, number][], closeY: number, w: number) =>
  `M-20 ${closeY} ` + edge.map(([px, py]) => `L${px.toFixed(1)} ${py.toFixed(1)}`).join(' ') + ` L${w + 20} ${closeY} Z`;

// The torn-off core of the sheet: the same paper, much lighter, so the fibres still show.
const CoreFill: React.FC<{id: string; w: number; h: number}> = ({id, w, h}) => (
  <defs>
    <pattern id={id} patternUnits="userSpaceOnUse" width={w} height={h}>
      <image href={staticFile('textures/paper-chart.png')} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
      <rect width={w} height={h} fill="#fcf9f2" opacity={0.72} />
    </pattern>
  </defs>
);

const PaperRip: React.FC<{start: number; duration: number; children: React.ReactNode}> = ({start, duration, children}) => {
  const f = useCurrentFrame();
  const {width: w, height: h} = useVideoConfig();
  if (f < start) return <AbsoluteFill>{children}</AbsoluteFill>;
  const t = (f - start) / duration;
  // A beat of strain, a crack, then the halves are pulled away.
  const strain = Math.sin(Math.min(t / 0.15, 1) * Math.PI) * 5;
  const crack = interpolate(t, [0.1, 0.3], [0, 30], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
  const fly = interpolate(t, [0.28, 1], [0, h * 0.66], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  const sep = crack + fly;
  const mid = h * 0.5;
  const edge = tearEdge('rip', w, mid, 30);
  const topCore = tearEdge('rip-top', w, mid, 30, 14); // white paper core exposed along the tear
  const botCore = tearEdge('rip-bot', w, mid, 30, -14);
  const shadow = 'drop-shadow(0 14px 22px rgba(30,20,8,0.5))';
  const fibres = 'drop-shadow(0 0 1.5px rgba(255,255,255,0.9))';
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `translateY(${-sep - strain}px) rotate(${-t * 2.6}deg)`, transformOrigin: '20% 0%', filter: shadow}}>
        <svg width={w} height={h} style={{position: 'absolute', filter: fibres}}>
          <CoreFill id="core-top" w={w} h={h} />
          <path d={toPath(topCore, -20, w)} fill="url(#core-top)" />
        </svg>
        <AbsoluteFill style={{clipPath: `path('${toPath(edge, -20, w)}')`}}>{children}</AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{transform: `translateY(${sep + strain}px) rotate(${t * 1.8}deg)`, transformOrigin: '80% 100%', filter: shadow}}>
        <svg width={w} height={h} style={{position: 'absolute', filter: fibres}}>
          <CoreFill id="core-bot" w={w} h={h} />
          <path d={toPath(botCore, h + 20, w)} fill="url(#core-bot)" />
        </svg>
        <AbsoluteFill style={{clipPath: `path('${toPath(edge, h + 20, w)}')`}}>{children}</AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- composition ----------

export const BROADSHEET_FRAMES = 210;
const RIP_AT = 72;
const RIP_LEN = 20;
const CLOSE_AT = 150;

export const BroadsheetSample: React.FC = () => (
  <AbsoluteFill style={{background: '#2b241b'}}>
    <Sequence from={RIP_AT} durationInFrames={CLOSE_AT + 12 - RIP_AT}>
      <LoserPage />
    </Sequence>
    <Sequence durationInFrames={RIP_AT + RIP_LEN}>
      <PaperRip start={RIP_AT} duration={RIP_LEN}>
        <ShockPage />
      </PaperRip>
    </Sequence>
    <Sequence from={CLOSE_AT}>
      <LayOn start={0}>
        <QuestionPage />
      </LayOn>
    </Sequence>
  </AbsoluteFill>
);
