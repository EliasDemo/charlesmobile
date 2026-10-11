import { env } from '@/shared/config';

/**
 * Image URLs come ready from the API: absolute in production, relative in development
 * (`/api/v1/media/img/...`), where the backend origin is prepended. Null stays null.
 */
export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/') ? `${env.apiUrl}${url}` : url;
}
