/*
 * This file (which will be your service worker)
 * is picked up by the build system ONLY if
 * quasar.config.js > pwa > workboxMode is set to "injectManifest"
 */

import { clientsClaim } from "workbox-core";
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from "workbox-precaching";
import {
  registerRoute,
  NavigationRoute,
  setDefaultHandler,
} from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

self.skipWaiting();
clientsClaim();

// Use with precache injection
precacheAndRoute(self.__WB_MANIFEST);

cleanupOutdatedCaches();

// Non-SSR fallback to index.html
// Production SSR fallback to offline.html (except for dev)
// if (process.env.MODE !== "ssr" || process.env.PROD) {
//   registerRoute(
//     new NavigationRoute(createHandlerBoundToURL("index.html"), {
//       denylist: [/sw\.js$/, /workbox-(.)*\.js$/],
//     })
//   );
//   // registerRoute(new RegExp("^http"), new StaleWhileRevalidate());
// }
setDefaultHandler(new StaleWhileRevalidate());
// registerRoute(
//   ({ request }) => request.destination === "assets",
//   new CacheFirst()
// );
registerRoute(
  new RegExp("^https://storage.googleapis.com"),
  new StaleWhileRevalidate({
    cacheName: "img-cache",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 3600 * 4,
        maxEntries: 500,
      }),
    ],
  })
);
registerRoute(
  ({ url }) => url.pathname.startsWith("/api"),
  new StaleWhileRevalidate({
    cacheName: "api-cache",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 3600,
      }),
    ],
  })
);
