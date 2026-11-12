// Renders one sheet of paper with Paper Shaders' PaperTexture (Apache-2.0) to a PNG,
// so reels use a still image: fast to render and identical on every frame.
// npx remotion still src/index.ts PaperStill public/textures/<name>.png --props='{"seed":49}' --gl=swangle
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender} from 'remotion';
import {PaperTexture, paperTexturePresets} from '@paper-design/shaders-react';

export type PaperStillProps = {seed: number; crumples: number; wrinkles: number; folds: number; drops: number};

export const PaperStill: React.FC<PaperStillProps> = ({seed, crumples, wrinkles, folds, drops}) => {
  const [handle] = useState(() => delayRender('paper shader'));
  useEffect(() => {
    let n = 0;
    const tick = () => (++n < 12 ? requestAnimationFrame(tick) : continueRender(handle));
    requestAnimationFrame(tick);
  }, [handle]);
  const base = paperTexturePresets.find((p) => p.name === 'Creased')!.params;
  return (
    <AbsoluteFill style={{background: '#efe7d6'}}>
      <PaperTexture
        {...base}
        style={{width: '100%', height: '100%'}}
        fit="cover"
        scale={1}
        speed={0}
        colorBack="#efe8d8"
        colorPaper="#fbf8f1"
        colorShadow="#8f826c"
        seed={seed}
        roughness={0.55}
        roughnessSize={0.35}
        fiber={0.55}
        fiberSize={0.45}
        crumples={crumples}
        crumpleCount={10}
        wrinkles={wrinkles}
        wrinkleSize={0.55}
        folds={folds}
        foldSizeX={0.7}
        foldSizeY={0.9}
        drops={drops}
        minPixelRatio={1}
      />
    </AbsoluteFill>
  );
};
