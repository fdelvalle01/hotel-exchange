import type {
  PlaceFurnitureRequest,
  PlaceFurnitureResponse,
  RemoveFurnitureResponse,
  RotateFurnitureResponse,
  Room,
} from '../types/api.types';
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

export function removeFurniture(
  roomId: number,
  roomFurnitureId: number,
  token: string,
): Promise<RemoveFurnitureResponse> {
  return apiRequest<RemoveFurnitureResponse>(
    `/api/rooms/${roomId}/furniture/${roomFurnitureId}`,
    { method: 'DELETE', token },
  );
}

export function rotateFurniture(
  roomId: number,
  roomFurnitureId: number,
  rotation: string,
  token: string,
): Promise<RotateFurnitureResponse> {
  return apiRequest<RotateFurnitureResponse>(
    `/api/rooms/${roomId}/furniture/${roomFurnitureId}/rotate`,
    { method: 'PATCH', body: { rotation }, token },
  );
}
