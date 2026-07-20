/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import type { WorkboxPlugin } from 'workbox-core'

// Clean up old caches from previous versions
cleanupOutdatedCaches()

// Precache static assets — the manifest is injected by workbox-build injectManifest
precacheAndRoute(self.__WB_MANIFEST)

// Cache Google Fonts with a CacheFirst strategy (long TTL)
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }) as WorkboxPlugin,
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 365 }) as WorkboxPlugin, // 1 year
    ],
  }),
)

// Cache images with StaleWhileRevalidate (30 day TTL)
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }) as WorkboxPlugin,
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 30 }) as WorkboxPlugin, // 30 days
    ],
  }),
)

// Skip waiting and claim clients immediately on activation
self.addEventListener('install', () => {
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
