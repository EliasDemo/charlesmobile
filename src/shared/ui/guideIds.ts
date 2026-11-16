/** Every guide of the app: the tests mark them as seen so they never open over a screen. */
export const GUIDE_IDS = ['schedule', 'barbers', 'blocks', 'promotions', 'cash'] as const;
export type GuideId = (typeof GUIDE_IDS)[number];
export const guideKey = (id: GuideId) => `guide.${id}`;
