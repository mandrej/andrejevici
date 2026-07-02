/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  dataLayer?: Record<string, unknown>[]
}

declare function gtag(...args: unknown[]): void

interface ImportMetaEnv {
  readonly VITE_ANDREJEVICI_BUILD?: string
  readonly ANDREJEVICI_BUILD?: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'register-service-worker' {
  export function register(swUrl: string, hooks?: unknown): void
}
