import type { Room } from '../types/api.types';
import { apiRequest } from './httpClient';

export function listRooms(token: string) {
  return apiRequest<Room[]>('/api/rooms', { token });
}

export function getRoom(roomId: number, token: string) {
  return apiRequest<Room>(`/api/rooms/${roomId}`, { token });
}
