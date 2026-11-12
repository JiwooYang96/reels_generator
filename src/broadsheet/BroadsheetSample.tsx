// Broadsheet style sample: a newspaper front page that tears open onto a chart page.
// 7 seconds, 1080x1920. Numbers are invented for the style test and labelled as a sample.
import React from 'react';
import {
  AbsoluteFill, Easing, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig,
} from 'remotion';
import {loadFont} from '@remotion/fonts';

const B = {
  paper: '#f3eee3', paperLight: '#fbf8f1', ink: '#151311', soft: '#6b655c', rule: '#2a2622',
  hair: 'rgba(21,19,17,0.22)', gold: '#a8730f', red: '#a8231b',
};
// Family names starting a word with a digit must be quoted in CSS, or the browser falls back.
const SERIF_NAME = 'Source Serif 4';
const SANS_NAME = 'Source Sans 3';
const MONO_NAME = 'IBM Plex Mono';
const SERIF = `'${SERIF_NAME}', Georgia, serif`;
const SANS = `'${SANS_NAME}', Helvetica, sans-serif`;
const MONO = `'${MONO_NAME}', monospace`;

for (const [family, file, weight, style] of [
  [SERIF_NAME, 'source-serif-4-latin-400-normal', '400', 'normal'],
  [SERIF_NAME, 'source-serif-4-latin-400-italic', '400', 'italic'],
  [SERIF_NAME, 'source-serif-4-latin-700-normal', '700', 'normal'],
  [SERIF_NAME, 'source-serif-4-latin-900-normal', '900', 'normal'],
  [SANS_NAME, 'source-sans-3-latin-600-normal', '600', 'normal'],
  [SANS_NAME, 'source-sans-3-latin-700-normal', '700', 'normal'],
  [MONO_NAME, 'ibm-plex-mono-latin-600-normal', '600', 'normal'],
] as const) {
  loadFont({family, url: staticFile(`fonts/${file}.woff2`), weight, style});
}

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const rise = (f: number, start: number, len = 10) => {
  const p = interpolate(f, [start, start + len], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  return {opacity: p, transform: `translateY(${(1 - p) * 40}px)`};
};

// ---------- paper ----------

const PaperTexture: React.FC<{seed?: number}> = ({seed = 3}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <svg width="100%" height="100%" style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.55}}>
      <filter id={`grain-${seed}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} />
        <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.40  0 0 0 0 0.33  0 0 0 0.22 0" />
      </filter>
      <filter id={`fibre-${seed}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.25" numOctaves={3} seed={seed + 7} />
        <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0.10 0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#fibre-${seed})`} />
      <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
    </svg>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(60,45,25,0.16) 100%)'}} />
  </AbsoluteFill>
);

const Rule: React.FC<{f: number; at: number; weight?: number; double?: boolean}> = ({f, at, weight = 2, double}) => {
  const w = interpolate(f, [at, at + 12], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  return (
    <div style={{width: `${w}%`, margin: '0 auto'}}>
      <div style={{borderTop: `${weight}px solid ${B.rule}`}} />
      {double ? <div style={{borderTop: `1px solid ${B.rule}`, marginTop: 5}} /> : null}
    </div>
  );
};

// Grey bars that read as set type at a glance, for column texture.
const ColumnText: React.FC<{lines: number; seed: number; f: number; at: number}> = ({lines, seed, f, at}) => (
  <div style={{opacity: interpolate(f, [at, at + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
    {Array.from({length: lines}).map((_, i) => (
      <div key={i} style={{
        height: 9, margin: '0 0 13px', background: B.hair, borderRadius: 2,
        width: `${i === lines - 1 ? 45 + random(`${seed}-${i}`) * 30 : 88 + random(`${seed}-${i}`) * 12}%`,
      }} />
    ))}
  </div>
);

const Masthead: React.FC<{f: number; section: string}> = ({f, section}) => (
  <div style={{padding: '184px 64px 0'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontWeight: 600, fontSize: 26,
      letterSpacing: 2, color: B.soft, textTransform: 'uppercase', ...rise(f, 0, 8)}}>
      <span>Friday, Nov 13, 2026</span><span style={{textTransform: 'none', letterSpacing: 0.5}}>@tech_stocks_news</span>
    </div>
    <div style={{margin: '18px 0 14px'}}><Rule f={f} at={2} weight={3} /></div>
    <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: 88, textAlign: 'center', color: B.ink,
      letterSpacing: 1, lineHeight: 1, ...rise(f, 3, 10)}}>
      Five Before Monday
    </div>
    <div style={{margin: '18px 0 0'}}><Rule f={f} at={6} weight={2} double /></div>
    <div style={{display: 'flex', justifyContent: 'center', gap: 28, fontFamily: SANS, fontWeight: 700, fontSize: 24,
      letterSpacing: 3, color: B.ink, textTransform: 'uppercase', padding: '14px 0 0', ...rise(f, 8, 8)}}>
      <span>Markets</span><span style={{color: B.gold}}>◆</span><span>{section}</span><span style={{color: B.gold}}>◆</span><span>Big Tech</span>
    </div>
  </div>
);

// ---------- scene A: the front page ----------

const FrontPage: React.FC = () => {
  const f = useCurrentFrame();
  const push = interpolate(f, [0, 110], [1, 1.045], {extrapolateRight: 'clamp'});
  const value = interpolate(f, [30, 54], [0, 7.8], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const headline = ['Chip Stocks Lose', '$400 Billion in a', 'Single Session'];
  return (
    <AbsoluteFill style={{background: B.paper, transform: `scale(${push})`}}>
      <Masthead f={f} section="Chips" />
      <div style={{padding: '48px 64px 0'}}>
        <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 28, letterSpacing: 4, color: B.gold,
          textTransform: 'uppercase', ...rise(f, 10, 8)}}>Semiconductors</div>
        <div style={{marginTop: 14}}>
          {headline.map((line, i) => (
            <div key={line} style={{overflow: 'hidden'}}>
              <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 112, lineHeight: 1.04, color: B.ink,
                letterSpacing: -1.5, ...rise(f, 12 + i * 4, 10)}}>{line}</div>
            </div>
          ))}
        </div>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 40, lineHeight: 1.35, color: B.soft,
          marginTop: 26, maxWidth: 900, ...rise(f, 24, 10)}}>
          Nvidia led the slide as buyers questioned how many more data centers the world needs.
        </div>
      </div>
      <div style={{display: 'flex', gap: 40, padding: '56px 64px 0', alignItems: 'flex-start'}}>
        <div style={{flex: '0 0 470px', position: 'relative', border: `3px solid ${B.ink}`, padding: '26px 28px 30px',
          ...rise(f, 28, 10)}}>
          <div style={{position: 'absolute', inset: 0, opacity: 0.18,
            backgroundImage: `radial-gradient(${B.ink} 2.2px, transparent 2.6px)`, backgroundSize: '12px 12px'}} />
          <div style={{position: 'relative', fontFamily: SANS, fontWeight: 700, fontSize: 24, letterSpacing: 3,
            textTransform: 'uppercase', color: B.ink}}>Nvidia, this week</div>
          <div style={{position: 'relative', fontFamily: SERIF, fontWeight: 900, fontSize: 156, lineHeight: 1,
            color: B.red, marginTop: 14, letterSpacing: -3, fontVariantNumeric: 'tabular-nums'}}>−{value.toFixed(1)}%</div>
          <div style={{position: 'relative', fontFamily: SANS, fontWeight: 600, fontSize: 22, color: B.soft,
            marginTop: 14}}>Sample figure, not real data</div>
        </div>
        <div style={{flex: 1, paddingTop: 6}}>
          <ColumnText lines={13} seed={1} f={f} at={34} />
        </div>
      </div>
      <div style={{display: 'flex', gap: 40, padding: '40px 64px 0'}}>
        <div style={{flex: 1}}><ColumnText lines={6} seed={2} f={f} at={38} /></div>
        <div style={{width: 1, background: B.hair}} />
        <div style={{flex: 1}}><ColumnText lines={6} seed={3} f={f} at={40} /></div>
      </div>
      <PaperTexture seed={3} />
    </AbsoluteFill>
  );
};

// ---------- scene B: the chart page ----------

const DAYS = [
  {d: 'Fri', v: 202.4}, {d: 'Mon', v: 199.0}, {d: 'Tue', v: 197.2}, {d: 'Wed', v: 195.6}, {d: 'Thu', v: 180.3}, {d: 'Fri', v: 186.6},
];

const ChartPage: React.FC = () => {
  const f = useCurrentFrame();
  const W = 952, H = 640, padL = 96, padR = 40, padT = 40, padB = 90;
  const lo = 176, hi = 206;
  const x = (i: number) => padL + (i * (W - padL - padR)) / (DAYS.length - 1);
  const y = (v: number) => padT + ((hi - v) / (hi - lo)) * (H - padT - padB);
  const path = DAYS.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.v)}`).join(' ');
  const draw = interpolate(f, [16, 62], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const len = 1500;
  const thu = 4;
  const note = interpolate(f, [58, 68], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  return (
    <AbsoluteFill style={{background: B.paper}}>
      <Masthead f={40} section="The Chart" />
      <div style={{padding: '44px 64px 0'}}>
        <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 28, letterSpacing: 4, color: B.gold,
          textTransform: 'uppercase', ...rise(f, 4, 8)}}>The week in one line</div>
        <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 84, lineHeight: 1.05, color: B.ink, marginTop: 12,
          letterSpacing: -1, whiteSpace: 'nowrap', ...rise(f, 7, 10)}}>Nvidia's Rough Week</div>
        <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 36, color: B.soft, marginTop: 14, ...rise(f, 12, 10)}}>
          Closing price, dollars per share
        </div>
      </div>
      <svg width={W} height={H} style={{margin: '36px 64px 0'}}>
        {[180, 190, 200].map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={B.hair} strokeWidth={2} strokeDasharray="2 8" />
            <text x={padL - 18} y={y(v) + 10} textAnchor="end" fontFamily={MONO} fontWeight={600} fontSize={28} fill={B.soft}>{v}</text>
          </g>
        ))}
        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke={B.rule} strokeWidth={3} />
        {DAYS.map((p, i) => (
          <text key={i} x={x(i)} y={H - padB + 48} textAnchor="middle" fontFamily={SANS} fontWeight={700} fontSize={28}
            letterSpacing={2} fill={i === thu ? B.ink : B.soft}>{p.d.toUpperCase()}</text>
        ))}
        <path d={path} fill="none" stroke={B.ink} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round"
          strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
        {DAYS.map((p, i) => {
          const shown = draw >= i / (DAYS.length - 1) - 0.001;
          return shown ? <circle key={i} cx={x(i)} cy={y(p.v)} r={i === thu ? 16 : 9} fill={i === thu ? B.red : B.paper}
            stroke={i === thu ? B.red : B.ink} strokeWidth={5} /> : null;
        })}
        <g opacity={note} transform={`translate(0 ${(1 - note) * 20})`}>
          <line x1={padL + 330} x2={x(thu) - 18} y1={y(184.5)} y2={y(DAYS[thu].v) - 6} stroke={B.red} strokeWidth={3} />
          <text x={padL + 10} y={y(184) - 10} fontFamily={SERIF} fontWeight={700} fontSize={44} fill={B.ink}>Thursday: −7.8%</text>
          <text x={padL + 10} y={y(184) + 34} fontFamily={SERIF} fontStyle="italic" fontSize={32} fill={B.soft}>its worst day in months</text>
        </g>
      </svg>
      <div style={{margin: '28px 64px 0', ...rise(f, 72, 10)}}>
        <Rule f={f} at={72} weight={3} />
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22}}>
          <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 44, color: B.ink}}>Why it fell: Sunday's report</div>
          <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 40, color: B.gold}}>→</div>
        </div>
        <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 24, color: B.soft, marginTop: 12, letterSpacing: 1}}>
          SAMPLE · ILLUSTRATIVE DATA, NOT REAL PRICES
        </div>
      </div>
      <PaperTexture seed={9} />
    </AbsoluteFill>
  );
};

// ---------- the paper rip ----------

// A jagged tear line across the frame: fine teeth on top of slow waves, seeded so it renders the same every frame.
const tearEdge = (seed: string, w: number, mid: number, amp: number, offset = 0) => {
  const pts: [number, number][] = [];
  for (let xx = -20, i = 0; xx <= w + 20; xx += 14, i++) {
    const wave = Math.sin(xx / 170 + random(`${seed}-p`) * 6) * amp * 0.9 + Math.sin(xx / 61 + 1.3) * amp * 0.35;
    const tooth = (random(`${seed}-${i}`) - 0.5) * amp * 0.9;
    pts.push([xx, mid + wave + tooth + offset]);
  }
  return pts;
};
const toPath = (edge: [number, number][], closeY: number, w: number) =>
  `M-20 ${closeY} ` + edge.map(([px, py]) => `L${px} ${py}`).join(' ') + ` L${w + 20} ${closeY} Z`;

const PaperRip: React.FC<{start: number; duration: number; children: React.ReactNode}> = ({start, duration, children}) => {
  const f = useCurrentFrame();
  const {width: w, height: h} = useVideoConfig();
  if (f < start) return <AbsoluteFill>{children}</AbsoluteFill>;
  // A short crack first, then the halves fly apart.
  const t = (f - start) / duration;
  const crack = interpolate(t, [0, 0.25], [0, 26], {extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
  const fly = interpolate(t, [0.2, 1], [0, h * 0.62], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  const sep = crack + fly;
  const mid = h * 0.52;
  const edge = tearEdge('rip', w, mid, 34);
  const topFringe = tearEdge('rip-top', w, mid, 34, 12); // paper core showing below the top half's print
  const botFringe = tearEdge('rip-bot', w, mid, 34, -12);
  const shadow = 'drop-shadow(0 10px 18px rgba(40,28,10,0.45))';
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `translateY(${-sep}px) rotate(${-t * 2.2}deg)`, transformOrigin: '50% 0%', filter: shadow}}>
        <svg width={w} height={h} style={{position: 'absolute'}}>
          <path d={toPath(topFringe, -20, w)} fill={B.paperLight} />
        </svg>
        <AbsoluteFill style={{clipPath: `path('${toPath(edge, -20, w)}')`}}>{children}</AbsoluteFill>
      </AbsoluteFill>
      <AbsoluteFill style={{transform: `translateY(${sep}px) rotate(${t * 1.6}deg)`, transformOrigin: '50% 100%', filter: shadow}}>
        <svg width={w} height={h} style={{position: 'absolute'}}>
          <path d={toPath(botFringe, h + 20, w)} fill={B.paperLight} />
        </svg>
        <AbsoluteFill style={{clipPath: `path('${toPath(edge, h + 20, w)}')`}}>{children}</AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- composition ----------

export const BROADSHEET_FRAMES = 210;
const RIP_AT = 86;
const RIP_LEN = 20;

export const BroadsheetSample: React.FC = () => (
  <AbsoluteFill style={{background: '#2b2620'}}>
    <Sequence from={RIP_AT - 2}>
      <ChartPage />
    </Sequence>
    <Sequence durationInFrames={RIP_AT + RIP_LEN}>
      <PaperRip start={RIP_AT} duration={RIP_LEN}>
        <FrontPage />
      </PaperRip>
    </Sequence>
  </AbsoluteFill>
);
