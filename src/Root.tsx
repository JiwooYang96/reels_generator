import {Composition} from 'remotion';
import {NvidiaShort} from './NvidiaShort';
import {StockShort} from './StockShort';

export const Root: React.FC = () => (
  <>
  <Composition
    id="StockShort"
    component={StockShort}
    durationInFrames={300}
    fps={30}
    width={1080}
    height={1920}
  />
  <Composition
    id="NvidiaShort"
    component={NvidiaShort}
    durationInFrames={300}
    fps={30}
    width={1080}
    height={1920}
  />
  </>
);
