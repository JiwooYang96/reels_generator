// Broadsheet style sample: a printed front page that tears open onto a chart page.
// 7 s, 1080x1920. Figures are invented for the style test and labelled as a sample.
//
// Paper: still frames rendered from Paper Shaders' PaperTexture (Apache-2.0), see PaperStill.tsx.
// Type: Instrument Serif (titles), Source Serif 4 (body), Source Sans 3 (labels), all OFL.
import React from 'react';
import {AbsoluteFill, Easing, Img, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/fonts';

const INK = '#16130f';
const SOFT = '#5d564b';
const GOLD = '#9a6a12';
const RED = '#9e2016';
const HAIR = 'rgba(22,19,15,0.35)';

const fam = (name: string, fallback: string) => `'${name}', ${fallback}`;
const DISPLAY = fam('Instrument Serif', 'Georgia, serif');
const BODY = fam('Source Serif 4', 'Georgia, serif');
const LABEL = fam('Source Sans 3', 'Helvetica, sans-serif');

for (const [family, file, weight, style] of [
  ['Instrument Serif', 'instrument-serif-latin-400-normal', '400', 'normal'],
  ['Instrument Serif', 'instrument-serif-latin-400-italic', '400', 'italic'],
  ['Source Serif 4', 'source-serif-4-latin-400-normal', '400', 'normal'],
  ['Source Serif 4', 'source-serif-4-latin-400-italic', '400', 'italic'],
  ['Source Serif 4', 'source-serif-4-latin-700-normal', '700', 'normal'],
  ['Source Sans 3', 'source-sans-3-latin-600-normal', '600', 'normal'],
  ['Source Sans 3', 'source-sans-3-latin-700-normal', '700', 'normal'],
] as const) {
  loadFont({family, url: staticFile(`fonts/${file}.woff2`), weight, style});
}

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

const Masthead: React.FC<{f: number; section: string}> = ({f, section}) => (
  <div style={{padding: '182px 70px 0'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: LABEL, fontWeight: 600, fontSize: 25,
      letterSpacing: 2.5, color: SOFT, textTransform: 'uppercase', ...rise(f, 0, 10, 14)}}>
      <span>Friday, Nov 13, 2026</span>
      <span style={{textTransform: 'none', letterSpacing: 0.5}}>@tech_stocks_news</span>
    </div>
    <div style={{margin: '16px 0 4px'}}><Rule f={f} at={2} w={3} /></div>
    <div style={{fontFamily: DISPLAY, fontSize: 132, lineHeight: 1, textAlign: 'center', color: INK, letterSpacing: -1,
      padding: '10px 0 2px', ...settle(f, 2, 16)}}>
      Five Before Monday
    </div>
    <Rule f={f} at={6} w={2} double />
    <div style={{display: 'flex', justifyContent: 'center', gap: 26, fontFamily: LABEL, fontWeight: 700, fontSize: 23,
      letterSpacing: 3.5, color: INK, textTransform: 'uppercase', padding: '14px 0 0', ...rise(f, 8, 10, 12)}}>
      <span>Markets</span><span style={{color: GOLD}}>&#9670;</span><span>{section}</span><span style={{color: GOLD}}>&#9670;</span><span>Big Tech</span>
    </div>
  </div>
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

// ---------- scene A: the front page ----------

const TABLE = [
  ['Nvidia', '−7.8%'], ['Broadcom', '−6.1%'], ['Chip index', '−5.4%'], ['Nasdaq-100', '−2.9%'],
];

const FrontPage: React.FC = () => {
  const f = useCurrentFrame();
  const headline = ['Chip Stocks Shed', '$400 Billion in a', 'Single Session'];
  return (
    <Sheet paper="paper-front.png">
      <Masthead f={f} section="Chips" />
      <div style={{padding: '44px 70px 0'}}>
        <div style={{fontFamily: LABEL, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: GOLD,
          textTransform: 'uppercase', ...rise(f, 10, 10, 12)}}>Semiconductors</div>
        <div style={{marginTop: 8}}>
          {headline.map((line, i) => (
            <div key={line} style={{overflow: 'hidden', paddingBottom: 6}}>
              <div style={{fontFamily: DISPLAY, fontSize: 138, lineHeight: 0.98, color: INK, letterSpacing: -1.5,
                ...rise(f, 12 + i * 4, 14, 120)}}>{line}</div>
            </div>
          ))}
        </div>
        <div style={{fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 50, lineHeight: 1.16, color: SOFT, marginTop: 18,
          ...settle(f, 26)}}>
          Nvidia led Thursday's slide as investors asked how many more data centers the world will need.
        </div>
      </div>
      <div style={{display: 'flex', gap: 44, padding: '34px 70px 0'}}>
        <div style={{flex: 1, fontFamily: BODY, fontSize: 31, lineHeight: 1.42, color: INK, textAlign: 'left',
          ...settle(f, 32, 16)}}>
          <span style={{float: 'left', fontFamily: DISPLAY, fontSize: 142, lineHeight: 0.8, padding: '8px 12px 0 0',
            color: INK}}>C</span>
          hipmakers had their worst day since April. Nvidia fell 7.8%, Broadcom dropped 6.1% and the chip index closed
          5.4% lower, wiping roughly $400 billion off the sector before a partial rebound on Friday.
        </div>
        <div style={{width: 1, background: HAIR, ...settle(f, 34)}} />
        <div style={{flex: '0 0 330px', ...settle(f, 36, 16)}}>
          <div style={{fontFamily: LABEL, fontWeight: 700, fontSize: 22, letterSpacing: 3, textTransform: 'uppercase',
            color: INK, paddingBottom: 10, borderBottom: `3px solid ${INK}`}}>Thursday's close</div>
          {TABLE.map(([name, chg], i) => (
            <div key={name} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '13px 0', borderBottom: `1px solid ${HAIR}`, ...rise(f, 38 + i * 3, 10, 10)}}>
              <span style={{fontFamily: BODY, fontSize: 30, color: INK}}>{name}</span>
              <span style={{fontFamily: DISPLAY, fontSize: 50, lineHeight: 1, color: RED}}>{chg}</span>
            </div>
          ))}
          <div style={{fontFamily: LABEL, fontWeight: 600, fontSize: 19, color: SOFT, marginTop: 12, letterSpacing: 0.5}}>
            Sample figures for a style test
          </div>
        </div>
      </div>
    </Sheet>
  );
};

// ---------- scene B: the chart page ----------

const DAYS = [
  {d: 'Fri', v: 202.4}, {d: 'Mon', v: 199.0}, {d: 'Tue', v: 197.2}, {d: 'Wed', v: 195.6}, {d: 'Thu', v: 180.3}, {d: 'Fri', v: 186.6},
];

const ChartPage: React.FC = () => {
  const f = useCurrentFrame();
  const W = 940, H = 600, padL = 92, padR = 36, padT = 30, padB = 84;
  const lo = 176, hi = 206;
  const x = (i: number) => padL + (i * (W - padL - padR)) / (DAYS.length - 1);
  const y = (v: number) => padT + ((hi - v) / (hi - lo)) * (H - padT - padB);
  const path = DAYS.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.v)}`).join(' ');
  const draw = prog(f, 14, 46, Easing.inOut(Easing.cubic));
  const len = 1400;
  const thu = 4;
  const note = prog(f, 56, 12);
  return (
    <Sheet paper="paper-chart.png">
      <Masthead f={60} section="The Chart" />
      <div style={{padding: '40px 70px 0'}}>
        <div style={{fontFamily: LABEL, fontWeight: 700, fontSize: 26, letterSpacing: 4, color: GOLD,
          textTransform: 'uppercase', ...rise(f, 2, 10, 12)}}>The week in one line</div>
        <div style={{fontFamily: DISPLAY, fontSize: 138, lineHeight: 1, color: INK, letterSpacing: -1.5, marginTop: 6,
          ...rise(f, 4, 14, 60)}}>Nvidia's Rough Week</div>
        <div style={{fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 48, color: SOFT, marginTop: 12, ...settle(f, 10)}}>
          Four losing sessions, then a Friday bounce.
        </div>
      </div>
      <svg width={W} height={H} style={{margin: '26px 70px 0', overflow: 'visible'}}>
        {[180, 190, 200].map((v) => (
          <g key={v} opacity={prog(f, 8, 10)}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={HAIR} strokeWidth={2} strokeDasharray="2 9" />
            <text x={padL - 18} y={y(v) + 11} textAnchor="end" fontFamily={BODY} fontSize={30} fill={SOFT}>${v}</text>
          </g>
        ))}
        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke={INK} strokeWidth={3} />
        {DAYS.map((p, i) => (
          <text key={i} x={x(i)} y={H - padB + 46} textAnchor="middle" fontFamily={LABEL} fontWeight={700} fontSize={26}
            letterSpacing={2.5} fill={i === thu ? INK : SOFT}>{p.d.toUpperCase()}</text>
        ))}
        <path d={path} fill="none" stroke={INK} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
        {DAYS.map((p, i) => (draw >= i / (DAYS.length - 1) - 0.001
          ? <circle key={i} cx={x(i)} cy={y(p.v)} r={i === thu ? 15 : 8} fill={i === thu ? RED : '#efe7d6'}
            stroke={i === thu ? RED : INK} strokeWidth={4} />
          : null))}
        <g opacity={note} transform={`translate(0 ${(1 - note) * 16})`}>
          <line x1={padL + 360} x2={x(thu) - 18} y1={y(185.2)} y2={y(DAYS[thu].v) - 6} stroke={RED} strokeWidth={2.5} />
          <text x={padL + 14} y={y(184.6) - 8} fontFamily={DISPLAY} fontSize={58} fill={INK}>Thursday, −7.8%</text>
          <text x={padL + 14} y={y(184.6) + 32} fontFamily={DISPLAY} fontStyle="italic" fontSize={36} fill={SOFT}>its worst day in months</text>
        </g>
      </svg>
      <div style={{margin: '14px 70px 0', fontFamily: BODY, fontSize: 30, lineHeight: 1.42, color: INK, ...settle(f, 64)}}>
        Shares closed the week 7.8% lower at $186.60, after Friday recovered a third of Thursday's drop.
      </div>
      <div style={{margin: '26px 70px 0', ...settle(f, 74)}}>
        <Rule f={f} at={74} w={3} />
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 16}}>
          <div style={{fontFamily: DISPLAY, fontSize: 56, color: INK}}>Why it fell, in Sunday's report</div>
          <div style={{fontFamily: DISPLAY, fontSize: 56, color: GOLD}}>&#8594;</div>
        </div>
        <div style={{fontFamily: LABEL, fontWeight: 600, fontSize: 19, color: SOFT, marginTop: 6, letterSpacing: 1.5,
          textTransform: 'uppercase'}}>Sample · illustrative figures, not real prices</div>
      </div>
    </Sheet>
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
const RIP_AT = 92;
const RIP_LEN = 22;

export const BroadsheetSample: React.FC = () => (
  <AbsoluteFill style={{background: '#2b241b'}}>
    <Sequence from={RIP_AT}>
      <ChartPage />
    </Sequence>
    <Sequence durationInFrames={RIP_AT + RIP_LEN}>
      <PaperRip start={RIP_AT} duration={RIP_LEN}>
        <FrontPage />
      </PaperRip>
    </Sequence>
  </AbsoluteFill>
);
