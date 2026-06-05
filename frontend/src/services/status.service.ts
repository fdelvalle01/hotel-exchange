import type { PublicStatusResponse } from '../types/api.types';
import { apiRequest } from './httpClient';

export function getPublicStatus() {
  return apiRequest<PublicStatusResponse>('/api/public/status');
}
