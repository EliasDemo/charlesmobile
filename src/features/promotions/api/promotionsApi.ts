import { api, unwrap, type components } from '@/shared/api';

type S = components['schemas'];
export type PublicPromotion = S['PublicPromotionDto'];
export type Promotion = S['PromotionDto'];
export type PromotionStatus = Promotion['status'];
export type PromotionType = S['PromotionType'];
export type CreatePromotionBody = S['CreatePromotionDto'];
export type UpdatePromotionBody = S['UpdatePromotionDto'];

export const promotionKeys = {
  all: ['promotions'] as const,
  active: (shopId: string) => ['promotions', 'active', shopId] as const,
  managed: (shopId: string) => ['promotions', 'managed', shopId] as const,
};

/** Automatic promotions in force (the barbershop's and Charles's). Coupons are not listed. */
export const fetchActivePromotions = (id: string): Promise<PublicPromotion[]> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/promotions/active', { params: { path: { id } } }));

export const fetchShopPromotions = (id: string): Promise<Promotion[]> =>
  unwrap(api.GET('/api/v1/barbershops/{id}/promotions', { params: { path: { id } } }));

export const createPromotion = (id: string, body: CreatePromotionBody): Promise<Promotion> =>
  unwrap(api.POST('/api/v1/barbershops/{id}/promotions', { params: { path: { id } }, body }));

export const updatePromotion = (id: string, promotionId: string, body: UpdatePromotionBody) =>
  unwrap(
    api.PATCH('/api/v1/barbershops/{id}/promotions/{promotionId}', {
      params: { path: { id, promotionId } },
      body,
    }),
  );

export const addCoupon = (id: string, promotionId: string, code: string) =>
  unwrap(
    api.POST('/api/v1/barbershops/{id}/promotions/{promotionId}/coupons', {
      params: { path: { id, promotionId } },
      body: { code },
    }),
  );

export const removeCoupon = (id: string, promotionId: string, couponId: string) =>
  unwrap(
    api.DELETE('/api/v1/barbershops/{id}/promotions/{promotionId}/coupons/{couponId}', {
      params: { path: { id, promotionId, couponId } },
    }),
  );
