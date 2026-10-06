import { api, unwrap, type components } from '@/shared/api';

export type Health = components['schemas']['HealthResponseDto'];

export const healthKeys = {
  all: ['health'] as const,
};

export const fetchHealth = (): Promise<Health> => unwrap(api.GET('/api/v1/health'));
