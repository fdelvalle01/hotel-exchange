import type { InventoryResponse } from '../types/api.types';
import { apiRequest } from './httpClient';

export function getMyInventory(token: string) {
  return apiRequest<InventoryResponse>('/api/me/inventory', { token });
}
