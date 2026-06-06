/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_DEBUG?: string;
  readonly VITE_FURNITURE_DEPTH_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
