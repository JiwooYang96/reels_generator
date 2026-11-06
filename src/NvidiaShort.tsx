import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Background, C, Caption, Card, FONT, Source, ease, fade, money, pop} from './kit';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// ---------- Scene 1: hook (dark) ----------
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const slam = pop(f, 34, 10);
  const shake = f > 34 && f < 46 ? Math.sin(f * 2.2) * (46 - f) * 1.6 : 0;
  const glow = interpolate(f, [30, 40, 66], [0, 1, 0.55], clamp);
  return (
    <AbsoluteFill>
      <Background theme="dark" />
      <div
        style={{
          position: 'absolute', left: 540 - 520, top: 960 - 520, width: 1040, height: 1040, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(242,194,91,0.35) 0%, rgba(242,194,91,0) 65%)', opacity: glow,
        }}
      />
      <Caption
        theme="dark"
        words={[
          {t: "Nvidia's", at: 0}, {t: 'RTX', at: 5}, {t: '5080', at: 9},
          {t: 'now', at: 14, br: true}, {t: 'costs', at: 19}, {t: 'DOUBLE.', at: 26, key: true},
        ]}
      />
      <div
        style={{
          position: 'absolute', left: 170, top: 640, width: 740, height: 600,
          rotate: `${-6 + shake * 0.3}deg`, translate: `${shake}px ${interpolate(f, [0, 14], [80, 0], {...clamp, easing: ease})}px`,
          opacity: fade(f, 0, 10),
        }}
      >
        <Card dark style={{width: 740, height: 600, padding: 56, boxSizing: 'border-box', position: 'relative'}}>
          <div style={{position: 'absolute', top: 40, right: 48, width: 44, height: 44, borderRadius: '50%', border: '6px solid rgba(242,194,91,0.5)'}} />
          <div style={{color: C.goldLight, fontSize: 38, fontWeight: 700, letterSpacing: 6}}>GEFORCE RTX 5080</div>
          <div style={{color: 'rgba(244,239,230,0.5)', fontSize: 32, marginTop: 10, fontWeight: 500}}>launch price · Jan 2025</div>
          <div style={{position: 'relative', marginTop: 40, display: 'inline-block'}}>
            <div style={{color: '#f4efe6', fontSize: 190, fontWeight: 800, letterSpacing: -6, opacity: 1 - slam * 0.55}}>$999</div>
            <div
              style={{
                position: 'absolute', left: -10, top: '52%', height: 14, borderRadius: 7, background: C.red,
                width: `${interpolate(f, [30, 38], [0, 105], clamp)}%`,
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute', right: -60, bottom: -70, background: C.goldLight, color: C.ink, borderRadius: 28,
              padding: '18px 40px', fontSize: 120, fontWeight: 900, letterSpacing: -4, rotate: '8deg',
              scale: `${slam}`, boxShadow: '0 30px 80px rgba(242,194,91,0.45)',
            }}
          >
            $2,199
          </div>
        </Card>
      </div>
    </AbsoluteFill>
  );
};

// ---------- Scene 2: the numbers (light) ----------
const Tube: React.FC<{label: string; value: number; max: number; start: number; strong?: boolean}> = ({label, value, max, start, strong}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [start, start + 26], [0, 1], {...clamp, easing: ease});
  const H = 560;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 300}}>
      <div style={{fontSize: 64, fontWeight: 800, color: strong ? C.gold : C.inkSoft, letterSpacing: -2, marginBottom: 20, fontVariantNumeric: 'tabular-nums'}}>
        {money(999 + (value - 999) * p * (value === 999 ? 0 : 1))}
      </div>
      <div style={{width: 170, height: H, borderRadius: 85, background: 'rgba(60,45,20,0.06)', border: '3px solid rgba(60,45,20,0.1)', position: 'relative', overflow: 'hidden'}}>
        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: (H * value * p) / max, borderRadius: 85,
            background: strong ? `linear-gradient(180deg, ${C.goldLight}, ${C.gold})` : 'linear-gradient(180deg, #d9d2c5, #b8afa0)',
          }}
        />
      </div>
      <div style={{fontSize: 36, fontWeight: 700, color: C.ink, marginTop: 24}}>{label}</div>
    </div>
  );
};

const Numbers: React.FC = () => {
  const f = useCurrentFrame();
  const badge = pop(f, 58, 12);
  return (
    <AbsoluteFill>
      <Background theme="light" />
      <Caption
        theme="light"
        words={[
          {t: 'Launched', at: 0}, {t: 'at', at: 6}, {t: '$999.', at: 10, key: true},
          {t: 'Today:', at: 30, br: true}, {t: '$2,199.', at: 36, key: true},
        ]}
      />
      <div style={{position: 'absolute', left: 110, top: 470, opacity: fade(f, 0, 10), translate: `0px ${interpolate(f, [0, 14], [60, 0], {...clamp, easing: ease})}px`}}>
        <Card style={{width: 860, height: 900, padding: 50, boxSizing: 'border-box', position: 'relative'}}>
          <div style={{fontSize: 30, fontWeight: 700, color: C.inkSoft, letterSpacing: 4}}>RTX 5080 · CHEAPEST IN STOCK</div>
          <div style={{display: 'flex', justifyContent: 'space-around', marginTop: 50}}>
            <Tube label="MSRP" value={999} max={2199} start={8} />
            <Tube label="Oct 30, 2026" value={2199} max={2199} start={32} strong />
          </div>
          <div
            style={{
              position: 'absolute', left: 285, top: 420, background: C.ink, color: C.goldLight, borderRadius: 28,
              padding: '14px 40px', fontSize: 120, fontWeight: 900, letterSpacing: -4, scale: `${badge}`, rotate: '-5deg',
              boxShadow: '0 30px 70px rgba(25,21,16,0.35)',
            }}
          >
            2.2x
          </div>
        </Card>
      </div>
      <Source theme="light" text="Source: Tom's Hardware, Oct 30 2026" />
    </AbsoluteFill>
  );
};

// ---------- Scene 3: store pulled it (light) ----------
const Row: React.FC<{name: string; price: string; stampAt: number}> = ({name, price, stampAt}) => {
  const f = useCurrentFrame();
  const s = pop(f, stampAt, 8);
  return (
    <div style={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '34px 36px', borderRadius: 24, background: 'rgba(60,45,20,0.04)', marginTop: 22}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
        <div style={{width: 96, height: 64, borderRadius: 12, background: '#22201c', display: 'flex', alignItems: 'center', justifyContent: 'space-evenly'}}>
          <div style={{width: 34, height: 34, borderRadius: '50%', border: '5px solid #6b655c'}} />
          <div style={{width: 34, height: 34, borderRadius: '50%', border: '5px solid #6b655c'}} />
        </div>
        <div style={{fontSize: 46, fontWeight: 800, color: C.ink, opacity: 1 - s * 0.6}}>{name}</div>
      </div>
      <div style={{fontSize: 42, fontWeight: 700, color: C.inkSoft, opacity: 1 - s * 0.6}}>{price}</div>
      <div
        style={{
          position: 'absolute', right: 14, top: 22, border: `6px solid ${C.red}`, color: C.red, borderRadius: 14,
          padding: '6px 22px', fontSize: 52, fontWeight: 900, letterSpacing: 4, rotate: '-10deg',
          scale: `${interpolate(s, [0, 1], [2.2, 1])}`, opacity: s, background: 'rgba(255,253,248,0.85)',
        }}
      >
        REMOVED
      </div>
    </div>
  );
};

const Store: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background theme="light" />
      <Caption
        theme="light"
        words={[
          {t: "Nvidia's", at: 0}, {t: 'own', at: 5}, {t: 'store', at: 9},
          {t: 'quietly', at: 14, br: true}, {t: 'pulled', at: 20, key: true}, {t: 'it.', at: 26},
        ]}
      />
      <div style={{position: 'absolute', left: 90, top: 520, opacity: fade(f, 0, 10), translate: `0px ${interpolate(f, [0, 14], [60, 0], {...clamp, easing: ease})}px`}}>
        <Card style={{width: 900, padding: 44, boxSizing: 'border-box'}}>
          <div style={{display: 'flex', gap: 14, marginBottom: 26}}>
            {['#e66a5e', '#e8b84a', '#7cc46b'].map((c) => (
              <div key={c} style={{width: 22, height: 22, borderRadius: '50%', background: c}} />
            ))}
            <div style={{marginLeft: 20, fontSize: 30, fontWeight: 600, color: C.inkSoft}}>official store · GeForce</div>
          </div>
          <Row name="RTX 5090" price="$1,999" stampAt={18} />
          <Row name="RTX 5080" price="$999" stampAt={30} />
          <div style={{fontSize: 30, color: C.inkSoft, marginTop: 30, fontWeight: 500, textAlign: 'center'}}>
            Street price now 2.2x MSRP
          </div>
        </Card>
      </div>
      <Source theme="light" text="Source: Tom's Hardware, Oct 30 2026" />
    </AbsoluteFill>
  );
};

// ---------- Scene 4: third hike + reason (dark) ----------
const Hikes: React.FC = () => {
  const f = useCurrentFrame();
  const items = [
    {m: 'JAN', v: '+10–15%', at: 8},
    {m: 'MAY', v: 'RTX 5090', at: 14},
    {m: 'JUL', v: '+20–30%', at: 20},
  ];
  return (
    <AbsoluteFill>
      <Background theme="dark" />
      <Caption
        theme="dark"
        words={[
          {t: '3rd', at: 0, key: true}, {t: 'price', at: 4}, {t: 'hike', at: 7}, {t: 'of', at: 10}, {t: '2026.', at: 13},
          {t: 'Blame', at: 30, br: true}, {t: 'memory', at: 34, key: true}, {t: 'chips.', at: 38},
        ]}
      />
      <div style={{position: 'absolute', left: 90, top: 560, width: 900, fontFamily: FONT}}>
        <div style={{position: 'absolute', left: 60, right: 60, top: 70, height: 6, background: 'rgba(242,194,91,0.18)', borderRadius: 3}}>
          <div style={{height: 6, borderRadius: 3, background: C.goldLight, width: `${interpolate(f, [6, 26], [0, 100], {...clamp, easing: ease})}%`}} />
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '0 0'}}>
          {items.map((it) => (
            <div key={it.m} style={{width: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', scale: `${pop(f, it.at, 10)}`}}>
              <div style={{width: 140, height: 140, borderRadius: '50%', background: '#17140f', border: `5px solid ${C.goldLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.goldLight, fontSize: 40, fontWeight: 800, boxShadow: '0 0 60px rgba(242,194,91,0.35)'}}>
                {it.m}
              </div>
              <div style={{color: '#f4efe6', fontSize: 44, fontWeight: 800, marginTop: 24, whiteSpace: 'nowrap'}}>{it.v}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 90, opacity: fade(f, 32, 10), translate: `0px ${interpolate(f, [32, 44], [40, 0], {...clamp, easing: ease})}px`,
          }}
        >
          <Card dark style={{padding: '40px 44px', display: 'flex', alignItems: 'center', gap: 34}}>
            <div style={{width: 130, height: 130, borderRadius: 18, background: '#26211a', border: `4px solid ${C.gold}`, position: 'relative', flexShrink: 0}}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{position: 'absolute', left: -18, top: 18 + i * 28, width: 14, height: 10, background: C.gold, borderRadius: 2}} />
              ))}
              {[0, 1, 2, 3].map((i) => (
                <div key={'r' + i} style={{position: 'absolute', right: -18, top: 18 + i * 28, width: 14, height: 10, background: C.gold, borderRadius: 2}} />
              ))}
              <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.goldLight, fontSize: 30, fontWeight: 800}}>
                VRAM
              </div>
            </div>
            <div style={{color: '#f4efe6', fontSize: 44, fontWeight: 700, lineHeight: 1.2}}>
              AI data centers are buying up the <span style={{color: C.goldLight}}>memory supply</span>
            </div>
          </Card>
        </div>
      </div>
      <Source theme="dark" text="Sources: Economic Daily News via BigGo, Tech Insider" />
    </AbsoluteFill>
  );
};

// Quick white flash between scenes for a punchy cut.
const Flash: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{background: '#fff', opacity: interpolate(f, [0, 2, 7], [0, 0.8, 0], clamp)}} />;
};

export const NvidiaShort: React.FC = () => (
  <AbsoluteFill style={{background: C.dark}}>
    <Sequence durationInFrames={66}><Hook /></Sequence>
    <Sequence from={66} durationInFrames={90}><Numbers /></Sequence>
    <Sequence from={156} durationInFrames={72}><Store /></Sequence>
    <Sequence from={228} durationInFrames={72}><Hikes /></Sequence>
    {[64, 154, 226].map((at) => (
      <Sequence key={at} from={at} durationInFrames={8}><Flash /></Sequence>
    ))}
    <Audio src={staticFile('sfx.wav')} />
  </AbsoluteFill>
);
