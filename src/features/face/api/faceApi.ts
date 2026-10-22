import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type FaceShape = S['FaceShapeResultDto']['shape'];
export type HaircutRecommendation = S['HaircutRecommendationDto'];
export type RecommendedHaircut = S['RecommendedHaircutDto'];
export type RecommendInput = S['RecommendHaircutsDto'];
export type HairType = NonNullable<RecommendInput['hairType']>;
export type Vibe = NonNullable<RecommendInput['vibe']>;
export type Maintenance = NonNullable<RecommendInput['maintenance']>;

/** Haircuts that suit the face, with real photos nearby and the best barbers for each one. */
export const recommendHaircuts = (body: RecommendInput): Promise<HaircutRecommendation> =>
  unwrap(api.POST('/api/v1/recommendations/haircuts', { body }));

/** What the person looks at, saves or books (with a session; helps future suggestions). */
export const sendInteraction = (body: S['StyleInteractionDto']) =>
  unwrap(api.POST('/api/v1/recommendations/interactions', { body }));

/** "Recordar mi forma de cara": only with explicit consent; null forgets it. */
export const rememberFaceShape = (faceShape: FaceShape | null) =>
  unwrap(
    api.PATCH('/api/v1/users/me', {
      body: faceShape ? { faceShape, faceShapeConsent: true } : { faceShape: null },
    }),
  );
