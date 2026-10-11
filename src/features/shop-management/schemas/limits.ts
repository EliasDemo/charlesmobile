/**
 * Text limits published in the API contract (docs/api/openapi.json, minLength/maxLength). The
 * backend validates them again; here they guide the user before sending.
 */
export const LIMITS = {
  shopName: { min: 2, max: 120 },
  address: { min: 5, max: 200 },
  description: { max: 1000 },
  url: { max: 300 },
  barberName: { min: 2, max: 80 },
  bio: { max: 500 },
  serviceName: { min: 2, max: 80 },
  serviceDescription: { max: 500 },
  closureReason: { min: 2, max: 200 },
  blockReason: { max: 200 },
  email: { max: 254 },
} as const;
