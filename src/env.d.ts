declare namespace NodeJS {
  interface ProcessEnv {
    VITE_ROUTER_MODE: "hash" | "history" | "abstract" | undefined;
    VITE_ROUTER_BASE: string | undefined;
    VITE_ANDREJEVICI_BUILD: string;
    VITE_SERVICE_WORKER_FILE: "sw.js";
  }
}
