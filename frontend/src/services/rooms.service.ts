import type { PlaceFurnitureRequest, PlaceFurnitureResponse, Room } from '../types/api.types';
import { apiRequest } from './httpClient';

export function listRooms(token: string) {
  return apiRequest<Room[]>('/api/rooms', { token });
}

export function getRoom(roomId: number, token: string) {
  return apiRequest<Room>(`/api/rooms/${roomId}`, { token });
}

export function placeFurniture(
  roomId: number,
  request: PlaceFurnitureRequest,
  token: string,
): Promise<PlaceFurnitureResponse> {
  return apiRequest<PlaceFurnitureResponse>(`/api/rooms/${roomId}/furniture`, {
    method: 'POST',
    body: request,
    token,
  });
}
