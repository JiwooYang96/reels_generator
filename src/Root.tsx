import {Composition} from 'remotion';
import {NvidiaShort} from './NvidiaShort';
import {StockShort} from './StockShort';
import {PlanVideo} from './plan/PlanVideo';
import {type Plan, planSchema, totalFrames} from './plan/plan';
import samplePlan from '../plans/ai-selloff.json';

export const Root: React.FC = () => (
  <>
    {/* Plan-driven video: render with --props=<resolved plan json> (scripts/make.sh does this). */}
    <Composition
      id="PlanVideo"
      component={PlanVideo}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={300}
      defaultProps={planSchema.parse(samplePlan) as Plan}
      calculateMetadata={({props}: {props: Plan}) => ({durationInFrames: totalFrames(props)})}
    />
    {/* Hand-coded examples kept for reference. */}
    <Composition id="StockShort" component={StockShort} durationInFrames={300} fps={30} width={1080} height={1920} />
    <Composition id="NvidiaShort" component={NvidiaShort} durationInFrames={300} fps={30} width={1080} height={1920} />
  </>
);
