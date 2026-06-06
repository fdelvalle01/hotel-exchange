import { API_BASE_URL } from '../config/env';

const TOKEN_STORAGE_KEY = 'hotel_exchange_token';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function storeToken(token: string) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const url = `${API_BASE_URL}${path}`;
  const method = options.method ?? 'GET';

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (networkError) {
    if (import.meta.env.VITE_FURNITURE_DEBUG === 'true') {
      console.error('[httpClient] Network error', { method, url, cause: networkError });
    }
    throw new ApiError('Network error: backend unavailable or request blocked', 0, null);
  }

  const text = await response.text();
  let data: unknown = null;
  try {
    if (text.length > 0) {
      data = JSON.parse(text);
    }
  } catch {
    // non-JSON body (HTML error page from proxy or unhandled Spring error)
  }

  if (!response.ok) {
    const body = data as Record<string, unknown> | null;
    const message = typeof body?.message === 'string'
      ? body.message
      : `Server error (HTTP ${response.status})`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}
