import {barRank, calendarCta, causeChain, chapters, compareBars, counter, donut, grid100, headline, lineMove, priceSlam, scoreboard, stampList, timeline, versus} from './data';
import {openBreaking, openBurst, openCashRain, openLogo, openSpotlight, openTicker} from './openings';
import type {SceneDef} from './types';

// Every scene a plan may use. Add new scenes here and in docs/SCENES.md.
export const SCENES: Record<string, SceneDef> = {
  'open.logo': openLogo,
  'open.burst': openBurst,
  'open.ticker': openTicker,
  'open.spotlight': openSpotlight,
  'open.cashRain': openCashRain,
  'open.breaking': openBreaking,
  causeChain,
  counter,
  priceSlam,
  compareBars,
  lineMove,
  scoreboard,
  stampList,
  timeline,
  calendarCta,
  barRank,
  donut,
  grid100,
  versus,
  chapters,
  headline,
};
