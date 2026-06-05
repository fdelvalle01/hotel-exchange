import type { AuthResponse, User } from '../types/api.types';
import { apiRequest } from './httpClient';

export function login(username: string, password: string) {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

export function getMe(token: string) {
  return apiRequest<User>('/api/me', { token });
}
