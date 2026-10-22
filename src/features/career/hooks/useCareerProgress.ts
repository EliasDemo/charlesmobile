import { useEffect, useState } from 'react';
import { useAppSettings } from '@/shared/lib';
import type { BarberProfile } from '../api/careerApi';

/** The contract: a barber enters the ranking with 3 reviews (CARRERA.md). */
export const RANKING_MIN_REVIEWS = 3;
/** Cuts in the portfolio for a profile that sells itself. */
const PORTFOLIO_GOAL = 3;
/** Remembered once per device, like the tours. */
const RANKED_SEEN = 'career.ranked';

export type CareerStepKey = 'photo' | 'specialties' | 'portfolio' | 'available' | 'applied';
export interface CareerStep {
  key: CareerStepKey;
  done: boolean;
}

/** What the barber controls today, from data the API already gives. */
export function careerSteps(
  profile: BarberProfile,
  portfolioCount: number,
  hasApplied: boolean | undefined,
): CareerStep[] {
  const steps: CareerStep[] = [
    { key: 'photo', done: profile.photoUrl !== null },
    { key: 'specialties', done: profile.specialties.length > 0 },
    { key: 'portfolio', done: portfolioCount >= PORTFOLIO_GOAL },
    { key: 'available', done: profile.availableForWork || profile.workplaces.some((w) => w.current) },
  ];
  if (hasApplied !== undefined) steps.push({ key: 'applied', done: hasApplied });
  return steps;
}

/** The first time the profile shows a ranking position: a celebration, once. */
export function useRankCelebration(rank: number | null | undefined) {
  const markTour = useAppSettings((s) => s.markTour);
  // Whether it was already celebrated when the screen opened (marking it must not hide it now).
  const [alreadySeen] = useState(() => useAppSettings.getState().toursSeen.includes(RANKED_SEEN));
  const [expired, setExpired] = useState(false);
  const celebrating = rank != null && !alreadySeen && !expired;
  useEffect(() => {
    if (!celebrating) return undefined;
    markTour(RANKED_SEEN);
    const timer = setTimeout(() => setExpired(true), CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [celebrating, markTour]);
  return celebrating;
}

const CELEBRATION_MS = 4000;
