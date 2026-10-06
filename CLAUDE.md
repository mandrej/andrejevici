# CLAUDE.md

Quick reference for AI assistants and developers working on Andrejevici.

## Commands

### npm scripts

- `npm install` — install frontend dependencies.
- `npm run dev` — start the Next.js development server on port 3000.
- `npm run dev:pwa` — build the service worker, then start development with `NEXT_PUBLIC_PWA_DEV=true`.
- `npm run build` — run `next build --webpack`, then generate the PWA files.
- `npm run start` — run the existing `next start` script. The deployed production path is Firebase Hosting serving the static `dist/` export, not this command.
- `npm run lint` — run ESLint.
- `npm run format` — format tracked source, styles, Markdown, and JSON with Prettier.
- `npm run icons` — generate icons and screenshots from `public/logo.svg`.
- `npm test` — run the TypeScript tests through `tsx --test`.

### `./ands`

- `./ands run` — start Firebase emulators and import/export local state in `./data`.
- `./ands build` — update `NEXT_PUBLIC_BUILD` in `.env`, then run the production build.
- `./ands deploy` — deploy Firebase Hosting only.
- `./ands indexes` — deploy Firestore indexes only.
- `./ands functions` — build `functionNotify`, `functionCron`, and `functionThumb`, then deploy functions.
- `./ands icons` — run the icon generator.
- `./ands test` — run the targeted command `npm test test/slug.ts`.

The root package supports Node 18, 20, 22, or 24. Each Cloud Function package requires Node 24.

## Build and hosting model

`next.config.ts` is configured with `output: 'export'`, `distDir: 'dist'`, unoptimized images, `reactStrictMode: true`, `devIndicators: false`, and a `generateBuildId` that reads `GIT_HASH` from the environment. The build produces a static site in `dist/`. `scripts/build-pwa.js` copies the manifest, bundles `src-pwa/custom-service-worker.ts`, injects the Workbox precache manifest, writes `dist/sw.js`, and copies the worker to `public/sw.js`. `firebase.json` serves `dist/` through Firebase Hosting and rewrites unknown paths to `/index.html`.

The local `src/config.ts` file is ignored by Git and is required by the Firebase client and application helpers. Make sure the project-provided config file exists before running the app or tests; do not commit local config files.

## Application map

### Routes

The App Router contains:

- `/` — gallery/home page.
- `/list` — gallery, search, filtering, infinite scroll, and full-screen media view.
- `/add` — photo and video upload flow; contribution-gated.
- `/admin` — metadata repair and user administration; admin-gated.
- `/401` — unauthorized page.
- `not-found` — not-found handling.

`src/app/ClientProviders.tsx` wraps the app in `ThemeProvider` and dynamically imports `AppInitializer` and `AppToast` so their client bundles never block the initial shell. `AppInitializer` resets client state, loads counters and bucket totals, observes Firebase authentication and the signed-in `User` document, defers FCM foreground message setup until the page is idle (via `requestIdleCallback` and a dynamic `import('@/messaging')`), subscribes to the latest record, and registers `/sw.js` in production or when PWA development is enabled.

### Stores

Each store has a barrel file and a subdirectory with slice creators, `types.ts`, and optional selectors:

- `appStore` → `app/`: `createUiSlice`, `createRecordsSlice`, `createPhotoOpsSlice`.
- `userStore` → `user/`: `createAuthSlice`, `createNotificationsSlice`, `createUsersAdminSlice`.
- `valuesStore` → `values/`: `createCountersSlice`, `createValuesSlice`, `selectors.ts`.
- `bucketStore` → `bucket/`: `createBucketSlice`.
- `toastStore` → `toast/`: `createToastSlice`.

Use selector hooks for React components, for example `useUserStore((state) => state.user)`. For derived values data, use the memoized selectors from `values/selectors.ts`.

### Helpers and Firebase paths

Business logic lives in `src/helpers/`: `collections.ts`, `devices.ts`, `exif.ts`, `index.ts`, `models.ts`, `notify.ts`, `remedy.ts`, and `uploadTracker.ts`. Use the lazy collection references from `src/helpers/collections.ts` instead of duplicating raw collection names in client code.

`src/firebase.ts` exposes lazy singleton accessors (`auth()`, `db()`, `storage()`, `functions()`) that create each service on first call and connect to emulators in development. `src/messaging.ts` and `src/analytics.ts` are separate lazy modules loaded via dynamic `import()` to keep the Messaging, Analytics, and Installations SDKs out of the initial bundle.

The case-sensitive Firestore paths currently used by the app are `User`, `Photo`, `Counter`, `Bucket`, `Rename`, and `LastRecord`. FCM device tokens are stored in `User/{trimmed-lowercase-email}/Device`. Counter values are documents in `Counter`; they are not separate lowercase `tags`, `photographers`, `lenses`, or `models` collections.

## Authentication and permissions

Anonymous visitors can read and browse. Firebase sign-in creates or loads a `User` document. The client-side `canContribute()` gate requires a signed-in user with a non-empty nickname other than `???` and either `isAuthorized` or `isAdmin`. `/admin` additionally requires `isAdmin`; record edits/deletes check admin status or uploader email.

User timestamps are checked against the 60-day session limit. `AppInitializer` listens to the signed-in user document with `onSnapshot`, so permission changes and invalidation can be reflected without a reload. FCM token refresh is conditional on `allowPush`. The first newly created user is bootstrapped with elevated flags; subsequent users initially have an empty nickname and require administrator action before they can contribute.

These gates are application behavior. The current Firestore and Storage rules allow public reads and writes by any authenticated client, so do not document the rules as enforcing the client-side admin/editor roles.

## Cloud Functions

All functions use the `firebase-functions/v2` API. Source files live at the directory root (`index.ts`), not in a `src/` subdirectory.

- `functionThumb`: callable `generateThumbnail` and Storage-triggered `generateThumbnailOnUpload`; creates a 400px square cover crop as a progressive JPEG under `thumbnails/` with an `_400x400.jpeg` suffix and uses `thumbnailLocks` to avoid duplicate work.
- `functionCron`: scheduled `cronCounters` rebuilds `Counter` from `Photo`; scheduled `cronBucket` writes aggregate count and size to `Bucket/total`. Both run every three days in the configured Los Angeles timezone.
- `functionNotify`: HTTP `notify` endpoint; reads the `Device` collection group, sends multicast FCM messages, and removes failed device-token documents.

## Coding conventions

1. Use strict TypeScript and type-only imports where appropriate.
2. Consume Zustand through granular selectors in React components.
3. Reuse typed Firebase collection references from `src/helpers/collections.ts`.
4. Run `npm run lint` after changes. Use Prettier for documentation and code formatting, but inspect the diff because the format script writes all matching files.
5. Test PWA changes with `npm run dev:pwa`; production deployment is the generated static `dist/` directory.
