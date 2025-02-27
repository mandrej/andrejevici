declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined
    VUE_ROUTER_BASE: string | undefined
    ANDREJEVICI_VERSION: string
    SERVICE_WORKER_FILE: 'sw.js'
  }
}
