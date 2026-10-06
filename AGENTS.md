# AGENTS.md

Comprehensive guidance for contributors and AI agents working on Andrejevici.

## Project overview

Andrejevici is a Next.js photo and video album PWA. The client supports gallery browsing, search and filtering, EXIF metadata extraction, media uploads, metadata editing, thumbnail generation, Firebase Authentication, FCM notifications, and an admin interface.

## Technology and prerequisites

- Next.js 16 App Router with static export, React 19, strict TypeScript 5.9, and `reactStrictMode`.
- Tailwind CSS 4, Headless UI, Heroicons, `next-themes`, and `yet-another-react-lightbox`.
- Firebase 11 client SDK, Firestore, Storage, Authentication, Functions, Messaging, and Analytics.
- Zustand 5 with modular slices and memoized selectors.
- Workbox Build 7 and a custom service worker.
- Root package Node engine: 18, 20, 22, or 24. The three Cloud Function packages specify Node 24.
- npm and Firebase CLI (`firebase` can be installed globally or run through `npx`).

`src/config.ts` contains the project Firebase configuration and application limits. It is intentionally ignored by the repository's `config.ts` rule; use the project-provided local file and never add local configuration changes to a commit.

## Development workflow

Install dependencies and start the local backend and frontend in separate terminals:

```bash
npm install
./ands run
npm run dev
```

The development Firebase client connects to emulators at `127.0.0.1` for Auth, Firestore, Storage, and Functions. `./ands run` imports and exports emulator state through the ignored `./data` directory; the directory is local state, not repository seed data.

For PWA behavior during development:

```bash
npm run dev:pwa
```

### npm scripts

| Command           | Actual operation                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `npm run dev`     | Start Next.js development server.                                                          |
| `npm run dev:pwa` | Run `scripts/build-pwa.js`, then start Next.js with `NEXT_PUBLIC_PWA_DEV=true`.            |
| `npm run build`   | Run `next build --webpack`, then `scripts/build-pwa.js`.                                   |
| `npm run start`   | Run the existing `next start` script; not the configured Firebase Hosting deployment path. |
| `npm run lint`    | Run ESLint.                                                                                |
| `npm run format`  | Run Prettier over matching source, style, Markdown, and JSON files.                        |
| `npm run icons`   | Run `scripts/build-icons.js`.                                                              |
| `npm test`        | Run tests with `tsx --test`.                                                               |

### `./ands` operations

| Command            | Actual operation                                                           |
| ------------------ | -------------------------------------------------------------------------- |
| `./ands run`       | `firebase emulators:start --import ./data --export-on-exit ./data`.        |
| `./ands build`     | Replace `NEXT_PUBLIC_BUILD` in `.env`, then run `npm run build`.           |
| `./ands deploy`    | `firebase deploy --only hosting`; deploys the generated `dist/` site only. |
| `./ands indexes`   | Deploy `firestore.indexes.json`.                                           |
| `./ands functions` | Build all three function packages, then deploy all functions.              |
| `./ands icons`     | Run `npm run icons`.                                                       |
| `./ands test`      | Run the targeted command `npm test test/slug.ts`.                          |

`firebase.json` configures these emulator ports: Auth `9099`, Firestore `8080`, Realtime Database `9000`, Hosting `5000`, Storage `9199`, Functions `5001`, Emulator UI `4000`, Hub `4400`, and Logging `4500`.

## Build and PWA behavior

`next.config.ts` sets:

```ts
{
  generateBuildId: async () => process.env.GIT_HASH ?? null,
  output: 'export',
  distDir: 'dist',
  images: { unoptimized: true },
  reactStrictMode: true,
  devIndicators: false,
}
```

The production result is a static site in `dist/`. Firebase Hosting serves that directory and rewrites requests to `/index.html`. Use `./ands build` followed by `./ands deploy` for the configured deployment workflow. `next start` exists as an npm script but is not the normal production serving path for this static export.

`scripts/build-pwa.js` copies `src-pwa/manifest.json` to `public/` and `dist/`, bundles `src-pwa/custom-service-worker.ts` with esbuild, injects a Workbox precache manifest for generated static assets, writes `dist/sw.js`, removes its temporary bundle, and copies the generated worker to `public/sw.js`.

`src/app/AppInitializer.tsx` registers `/sw.js` in production or when `NEXT_PUBLIC_PWA_DEV=true`. The worker precaches generated assets, caches Google Fonts with Cache First for one year, and caches images with Stale While Revalidate for 30 days. The generated worker also references `public/firebase-messaging-sw.js` for Firebase Messaging.

## Application structure

### Routes and app lifecycle

- `/` — home/gallery entry point.
- `/list` — gallery listing, search/filter controls, infinite scrolling, media carousel, and photo information.
- `/add` — photo/video upload tabs and metadata flow.
- `/admin` — repair, metadata, and user administration tabs.
- `/401` — unauthorized page.
- `not-found` — not-found handling.

`src/app/layout.tsx` defines metadata, PWA links, icons, and the root `ClientProviders`. `ClientProviders` wraps the app in `ThemeProvider` from `next-themes` and dynamically imports `AppInitializer` and `AppToast` so their client bundles never block the shell from rendering. `AppInitializer` resets UI state, fetches bucket and counter values, observes Firebase Auth, listens to the signed-in user document, defers FCM foreground message setup until the page is idle (via `requestIdleCallback`), and subscribes to the latest record.

### Components

- `src/components/atoms/` — `AppBadge`, `AppBanner`, `AppButton`, `AppCheckbox`, `AppCombobox`, `AppDialog`, `AppIcon`, `AppInput`, `AppProgress`, `AppSelect`, `AppTabs`, `AppToast`, and `ThemeToggle`.
- `src/components/layouts/` — `DefaultLayout`, `PlainLayout`, and `Sidebar`.
- Other components cover autocomplete, search (global and local), media cards, photo/video record editing, selection management, tag merging, navigation, errors, and push-message sending.
- `src/composables/` — `useInfiniteScroll` and `useScreen` reusable UI hooks.
- `src/hooks/` — `useEditRecord` feature hook for record editing.

### Zustand stores

Each store has a top-level barrel file and a subdirectory containing slice creators and a `types.ts` file:

- `src/stores/appStore.ts` → `app/`: `createUiSlice`, `createRecordsSlice`, `createPhotoOpsSlice`, `types.ts`.
- `src/stores/userStore.ts` → `user/`: `createAuthSlice`, `createNotificationsSlice`, `createUsersAdminSlice`, `types.ts`.
- `src/stores/valuesStore.ts` → `values/`: `createCountersSlice`, `createValuesSlice`, `selectors.ts`, `types.ts`.
- `src/stores/bucketStore.ts` → `bucket/`: `createBucketSlice`, `types.ts`.
- `src/stores/toastStore.ts` → `toast/`: `createToastSlice`, `types.ts`.

`values/selectors.ts` exports memoized selectors (`selectTagsValues`, `selectModelValues`, `selectAllSuggestions`, etc.) that cache derived data and rebuild only when the underlying values reference changes.

Use selector hooks in components rather than subscribing to an entire store:

```tsx
const user = useUserStore((state) => state.user)
```

### Helpers

`src/helpers/` contains:

- `collections.ts` — lazy Firebase collection references (created on first use to avoid pulling Firestore into every route).
- `devices.ts` — batch deletion of FCM device-token documents under `User/{email}/Device`.
- `exif.ts` — client-side EXIF extraction.
- `index.ts` — dates, slugs/transliteration, permissions, thumbnails, YouTube helpers, and shared utilities.
- `models.ts` — TypeScript models such as `PhotoType`, `MyUserType`, `ValuesState`, and `AppStoreState`.
- `notify.ts` — client notification/toast helper.
- `remedy.ts` — storage/Firestore consistency and thumbnail repair actions.
- `uploadTracker.ts` — upload progress tracking.

### Firebase initialization

`src/firebase.ts` exposes lazy singleton accessors — `auth()`, `db()`, `storage()`, `functions()` — that create each Firebase service on first call and connect to emulators in development. This keeps SDK modules a route never touches out of its initial bundle. It also re-exports `logAnalyticsEvent`, which dynamically imports `src/analytics.ts`.

`src/messaging.ts` is a separate lazy module for Firebase Messaging. It is only reached through a dynamic `import()` in `AppInitializer` so the Messaging and Installations SDKs stay out of the initial bundle. `src/analytics.ts` follows the same pattern for Firebase Analytics.

## Firebase data model

Use the typed collection references from `src/helpers/collections.ts`. The current case-sensitive collection names are:

- `User` — user documents are keyed by the trimmed, lowercased email.
- `Photo` — photo and video metadata documents.
- `Counter` — metadata counter documents consumed by `valuesStore`.
- `Bucket` — aggregate storage information, including `Bucket/total`.
- `Rename` — rename mappings used by metadata management.
- `LastRecord` — latest-record subscription state.
- `Device` — a subcollection at `User/{normalized-email}/Device` containing FCM device tokens.

Do not introduce documentation or code that assumes separate lowercase `users`, `photos`, `tags`, `photographers`, `lenses`, or `models` collections without first changing and verifying the implementation.

A photo document follows `PhotoType` in `src/helpers/models.ts`: it includes an id, Storage URL, byte size, uploader email/nickname, optional headline/tags/search text, optional thumbnail URL/path, asset kind, and EXIF fields such as date, camera model, lens, focal length, aperture, shutter, ISO, flash, dimensions, and location.

## Authentication and permissions

Anonymous visitors can browse and read. Firebase Authentication uses Google sign-in. On sign-in, the app creates or loads a `User` document.

The client-side `canContribute()` helper in `src/helpers/index.ts` returns true only when the user has:

1. A signed-in user object.
2. A non-empty nickname that is not `???`.
3. `isAuthorized` or `isAdmin` set to true.

`/add`, upload controls, selection tools, and edit/delete actions use this gate. Record-level edit/delete additionally permits only the original uploader or an admin. `/admin` requires `isAdmin`.

The first newly created user is initialized as `admin`, authorized, and allowed push notifications. Later new users initially have an empty nickname and false authorization/admin flags until an administrator updates them. User timestamps are checked against `CONFIG.loginDays` (60 days). `AppInitializer` attaches a Firestore `onSnapshot` listener to the active user document, so permission changes and invalidation can take effect without a page reload. FCM token refresh and device writes are conditional on `allowPush`.

These are application-level gates. The current `firestore.rules` and `storage.rules` allow public reads and writes from authenticated clients; they do not enforce the client-side admin/editor roles. Treat any rules change as a security-sensitive change and inspect the deployed rules before relying on it.

## Cloud Functions

Each function directory has its own `package.json`, lockfile, TypeScript configuration, and Node 24 engine. Source files live at the directory root (`index.ts`), not in a `src/` subdirectory. All functions use the `firebase-functions/v2` API.

### `functionThumb`

- Exports callable `generateThumbnail`, which requires authentication.
- Exports Storage-triggered `generateThumbnailOnUpload`.
- Processes supported image extensions and skips existing `thumbnails/` objects.
- Uses `sharp` for a 400px by 400px `fit: cover` crop, progressive JPEG quality 85.
- Writes `thumbnails/<original-directory>/<name>_400x400.jpeg` using the event/request bucket.
- Uses the `thumbnailLocks` Firestore collection to avoid duplicate processing.

### `functionCron`

- `cronCounters` scans `Photo` and rebuilds metadata counters in `Counter`.
- `cronBucket` totals `Photo` count and size and writes `Bucket/total`.
- Both schedules run every three days in the configured `America/Los_Angeles` timezone.

### `functionNotify`

- Exposes the HTTP `notify` endpoint.
- Reads token documents through the `Device` collection group.
- Sends multicast FCM notifications.
- Deletes failed device-token documents after delivery attempts.

## Coding and verification rules

1. Use strict TypeScript and explicit types; use type-only imports when appropriate.
2. Reuse typed Firebase collection references instead of raw collection strings in client code.
3. Use Zustand selectors in React components.
4. Keep client permission checks and Firebase security rules conceptually separate.
5. Run `npm run lint` after changes. Use `npm run format` deliberately because it writes every matching file.
6. For PWA changes, run `npm run dev:pwa` and verify service-worker registration/caching in a browser.
7. For build/deploy changes, verify `dist/index.html`, `dist/sw.js`, and `dist/manifest.json`; use Firebase Hosting rather than assuming `next start` serves the exported site.
8. Before changing Firestore paths, check `src/helpers/collections.ts`, both function implementations, indexes, and deployed rules for case-sensitive names.
