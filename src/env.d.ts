/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  readonly PWA_FALLBACK_HTML?: string
  readonly PWA_SERVICE_WORKER_REGEX?: string
  readonly SERVICE_WORKER_FILE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'register-service-worker' {
  export function register(swUrl: string, hooks?: unknown): void
}

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_BUILD?: string
    NEXT_PUBLIC_PWA_DEV?: string
  }
}
