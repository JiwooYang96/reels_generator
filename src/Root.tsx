import {Composition} from 'remotion';
import {NvidiaShort} from './NvidiaShort';
import {StockShort} from './StockShort';
import {BroadsheetSample, BROADSHEET_FRAMES} from './broadsheet/BroadsheetSample';
import {PaperStill} from './broadsheet/PaperStill';
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
    {/* Style test: newspaper look with a paper-rip transition. */}
    <Composition id="BroadsheetSample" component={BroadsheetSample} durationInFrames={BROADSHEET_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="PaperStill" component={PaperStill} durationInFrames={1} fps={30} width={1080} height={1920}
      defaultProps={{seed: 49, crumples: 0.85, wrinkles: 0.5, folds: 0.35, drops: 0.25}} />
    {/* Hand-coded examples kept for reference. */}
    <Composition id="StockShort" component={StockShort} durationInFrames={300} fps={30} width={1080} height={1920} />
    <Composition id="NvidiaShort" component={NvidiaShort} durationInFrames={300} fps={30} width={1080} height={1920} />
  </>
);
