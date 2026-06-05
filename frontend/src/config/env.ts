function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export const API_BASE_URL = withoutTrailingSlash(
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
);

export const WS_BASE_URL = withoutTrailingSlash(
  import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8080',
);
