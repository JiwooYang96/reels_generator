// "AI stocks lost $5 trillion" — 10s short. Hook system built with Hooksmith / viral-short-form rules:
// stake hook (number in 1s) -> escalation (-9%, Intel) -> rehook ("But the Dow went UP") -> open-loop CTA (Friday).
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Background, C, Caption, Card, FONT, Source, ease, fade, pop} from './kit';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const RED = '#e0483d';
const GREEN = '#2fa36b';

// ---------- 1. Hook: $5 trillion counter (dark) ----------
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const p = interpolate(f, [4, 40], [0, 1], {...clamp, easing: ease});
  const trillions = 5 * p;
  const shake = f > 40 && f < 52 ? Math.sin(f * 2.4) * (52 - f) * 1.4 : 0;
  return (
    <AbsoluteFill>
      <Background theme="dark" />
      <div
        style={{
          position: 'absolute', left: 40, top: 520, width: 1000, height: 1000, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224,72,61,0.28) 0%, rgba(224,72,61,0) 65%)',
          opacity: interpolate(f, [30, 44], [0, 1], clamp),
        }}
      />
      <Caption
        theme="dark"
        words={[
          {t: 'AI', at: 0}, {t: 'stocks', at: 4}, {t: 'just', at: 8}, {t: 'lost', at: 12},
          {t: '$5 TRILLION.', at: 30, key: true, br: true},
        ]}
      />
      <div style={{position: 'absolute', left: 120, top: 640, width: 840, translate: `${shake}px 0px`, opacity: fade(f, 0, 8)}}>
        <Card dark style={{padding: '56px 50px', textAlign: 'center'}}>
          <div style={{color: 'rgba(244,239,230,0.55)', fontSize: 34, fontWeight: 600, letterSpacing: 5}}>AI STOCKS · MARKET VALUE LOST</div>
          <div style={{color: RED, fontSize: 210, fontWeight: 900, letterSpacing: -8, marginTop: 16, fontVariantNumeric: 'tabular-nums'}}>
            −${trillions.toFixed(1)}T
          </div>
          <div style={{height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.08)', marginTop: 20, overflow: 'hidden'}}>
            <div style={{height: 14, width: `${p * 100}%`, background: `linear-gradient(90deg, ${C.goldLight}, ${RED})`}} />
          </div>
          <div style={{color: '#f4efe6', fontSize: 44, fontWeight: 700, marginTop: 30, opacity: fade(f, 44, 8)}}>in about 3 weeks</div>
        </Card>
      </div>
      <Source theme="dark" text="Source: Yahoo Finance, Nov 2 2026" />
    </AbsoluteFill>
  );
};

// ---------- 2. Escalation: Nasdaq 100 drop + Intel (light) ----------
const Drop: React.FC = () => {
  const f = useCurrentFrame();
  const draw = interpolate(f, [4, 40], [0, 1], {...clamp, easing: ease});
  const path = 'M 40 70 L 120 95 L 170 80 L 250 150 L 310 135 L 390 210 L 450 190 L 540 300 L 600 285 L 680 330';
  return (
    <AbsoluteFill>
      <Background theme="light" />
      <Caption
        theme="light"
        words={[
          {t: 'Nasdaq', at: 0}, {t: '100:', at: 5}, {t: '−9%', at: 12, key: true},
          {t: 'from', at: 18, br: true}, {t: 'its', at: 22}, {t: 'record.', at: 26},
        ]}
      />
      <div style={{position: 'absolute', left: 120, top: 560, opacity: fade(f, 0, 8), translate: `0px ${interpolate(f, [0, 14], [60, 0], {...clamp, easing: ease})}px`}}>
        <Card style={{width: 840, height: 720, padding: 44, boxSizing: 'border-box', position: 'relative'}}>
          <div style={{fontSize: 30, fontWeight: 700, color: C.inkSoft, letterSpacing: 4}}>NASDAQ 100 · OCT 6 → OCT 30</div>
          <svg width={740} height={400} style={{marginTop: 30, overflow: 'visible'}}>
            <line x1={0} x2={740} y1={70} y2={70} stroke="rgba(60,45,20,0.25)" strokeWidth={3} strokeDasharray="10 10" />
            <path d={path} fill="none" stroke={RED} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
            <circle cx={40} cy={70} r={14} fill={C.gold} />
            <text x={60} y={50} fontFamily={FONT} fontSize={30} fontWeight={700} fill={C.gold}>Oct 6 record</text>
            <circle cx={680} cy={330} r={14 * draw} fill={RED} />
          </svg>
          <div
            style={{
              position: 'absolute', right: 70, top: 500, background: RED, color: '#fff', borderRadius: 24, padding: '10px 30px',
              fontSize: 96, fontWeight: 900, letterSpacing: -3, scale: `${pop(f, 40, 10)}`, rotate: '-4deg',
            }}
          >
            −9%
          </div>
          <div style={{position: 'absolute', left: 44, bottom: 40, fontSize: 24, color: C.inkSoft, fontWeight: 500}}>line shape illustrative · endpoints from source</div>
        </Card>
      </div>
      <div
        style={{
          position: 'absolute', left: 120, top: 1320, display: 'flex', gap: 18, alignItems: 'center', fontFamily: FONT,
          opacity: fade(f, 52, 8), translate: `0px ${interpolate(f, [52, 62], [30, 0], {...clamp, easing: ease})}px`,
        }}
      >
        <div style={{background: C.ink, color: '#fff', borderRadius: 18, padding: '12px 26px', fontSize: 40, fontWeight: 800}}>Intel</div>
        <div style={{color: RED, fontSize: 48, fontWeight: 900}}>−29% after earnings</div>
      </div>
      <Source theme="light" text="Source: Yahoo Finance, Nov 2 2026" />
    </AbsoluteFill>
  );
};

// ---------- 3. Rehook: but the Dow went UP (light) ----------
const Board: React.FC = () => {
  const f = useCurrentFrame();
  const rows = [
    {n: 'Dow', v: '+0.41%', c: GREEN, at: 14, hero: true},
    {n: 'S&P 500', v: '−0.51%', c: RED, at: 20},
    {n: 'Nasdaq', v: '−1.07%', c: RED, at: 26},
  ];
  return (
    <AbsoluteFill>
      <Background theme="light" />
      <Caption
        theme="light"
        words={[
          {t: 'But', at: 0}, {t: 'on', at: 4}, {t: 'Monday,', at: 7},
          {t: 'the', at: 12, br: true}, {t: 'Dow', at: 15}, {t: 'went', at: 18}, {t: 'UP.', at: 22, key: true},
        ]}
      />
      <div style={{position: 'absolute', left: 120, top: 560, opacity: fade(f, 0, 8), translate: `0px ${interpolate(f, [0, 14], [60, 0], {...clamp, easing: ease})}px`}}>
        <Card style={{width: 840, padding: 44, boxSizing: 'border-box'}}>
          <div style={{fontSize: 30, fontWeight: 700, color: C.inkSoft, letterSpacing: 4, marginBottom: 14}}>CLOSE · MON, NOV 2</div>
          {rows.map((r) => {
            const s = pop(f, r.at, 10);
            return (
              <div
                key={r.n}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, padding: '28px 34px', borderRadius: 24,
                  background: r.hero ? 'rgba(47,163,107,0.12)' : 'rgba(60,45,20,0.04)', border: r.hero ? `4px solid ${GREEN}` : '4px solid transparent',
                  scale: `${0.9 + 0.1 * s}`, opacity: s,
                }}
              >
                <div style={{fontSize: 58, fontWeight: 800, color: C.ink}}>{r.n}</div>
                <div style={{fontSize: 64, fontWeight: 900, color: r.c, fontVariantNumeric: 'tabular-nums'}}>
                  {r.v.startsWith('+') ? '▲ ' : '▼ '}{r.v}
                </div>
              </div>
            );
          })}
          <div style={{fontSize: 32, color: C.inkSoft, marginTop: 30, fontWeight: 600, textAlign: 'center', opacity: fade(f, 40, 8)}}>
            Money moved out of tech, not out of stocks
          </div>
        </Card>
      </div>
      <Source theme="light" text="Source: TheStreet, Nov 2 2026 close" />
    </AbsoluteFill>
  );
};

// ---------- 4. Open loop + CTA: Friday (dark) ----------
const Next: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = 1 + 0.04 * Math.sin(f / 3);
  return (
    <AbsoluteFill>
      <Background theme="dark" />
      <Caption
        theme="dark"
        words={[
          {t: 'The', at: 0}, {t: 'next', at: 4}, {t: 'test', at: 8}, {t: 'lands', at: 12},
          {t: 'FRIDAY.', at: 17, key: true, br: true},
        ]}
      />
      <div style={{position: 'absolute', left: 270, top: 560, opacity: fade(f, 0, 8), scale: `${pop(f, 2, 14)}`}}>
        <Card dark style={{width: 540, height: 560, overflow: 'hidden', position: 'relative'}}>
          <div style={{height: 130, background: C.goldLight, color: C.ink, fontSize: 64, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: 6}}>FRI</div>
          <div style={{color: '#f4efe6', fontSize: 170, fontWeight: 900, textAlign: 'center', marginTop: 50, letterSpacing: -5, whiteSpace: 'nowrap'}}>Nov 6</div>
          <div style={{color: C.goldLight, fontSize: 44, fontWeight: 800, textAlign: 'center', marginTop: 4}}>October jobs report</div>
        </Card>
      </div>
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 1210, textAlign: 'center', fontFamily: FONT, fontSize: 50, fontWeight: 800,
          color: '#f4efe6', opacity: fade(f, 34, 8), scale: `${f > 42 ? pulse : 1}`,
        }}
      >
        Follow so you see what happens →
      </div>
      <Source theme="dark" text="Source: Yahoo Finance, Nov 2 2026" />
    </AbsoluteFill>
  );
};

const Flash: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{background: '#fff', opacity: interpolate(f, [0, 2, 7], [0, 0.8, 0], clamp)}} />;
};

export const StockShort: React.FC = () => (
  <AbsoluteFill style={{background: C.dark}}>
    <Sequence durationInFrames={70}><Hook /></Sequence>
    <Sequence from={70} durationInFrames={80}><Drop /></Sequence>
    <Sequence from={150} durationInFrames={75}><Board /></Sequence>
    <Sequence from={225} durationInFrames={75}><Next /></Sequence>
    {[68, 148, 223].map((at) => (
      <Sequence key={at} from={at} durationInFrames={8}><Flash /></Sequence>
    ))}
    <Audio src={staticFile('sfx-stock.wav')} />
  </AbsoluteFill>
);
