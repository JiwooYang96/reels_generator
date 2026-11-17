// Channel identity. Shown on every scene and required in the closing follow CTA.
export const BRAND = {handle: '@fivebeforemonday'};

// The accounts this repo makes reels for. A plan picks one with "handle"; the render job queues it in that
// account's folder in FiveBeforeMonday, and post-reel.yml posts it with that account's token.
//   palettes: the looks a plan without "palette" rotates through (one = fixed house style).
export const ACCOUNTS = {
  '@fivebeforemonday': {plans: 'plans/daily', queue: 'reels', palettes: ['broadsheet'], beat: 'big tech (not chips)'},
  '@5beforemonday': {plans: 'plans/chips', queue: 'reels-chips', palettes: ['terminal', 'gold', 'editorial', 'midnight', 'broadsheet'], beat: 'chips and semiconductors'},
} as const;

export const accountFor = (handle?: string) => ACCOUNTS[(handle ?? BRAND.handle) as keyof typeof ACCOUNTS] ?? ACCOUNTS['@fivebeforemonday'];
