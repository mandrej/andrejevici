# Andrejevici

Andrejevici is a photo and video album Progressive Web App for browsing, searching, uploading, tagging, and managing media. It uses Next.js, React, TypeScript, Firebase, Zustand, and Workbox.

## Features

- Gallery browsing with search, metadata filters, infinite scrolling, and a full-screen media view.
- Photo and video uploads with client-side EXIF extraction for supported images.
- Transliteration and normalized search text for Cyrillic and Latin input.
- Metadata editing, tag management, and administrator repair tools.
- Firebase Authentication with application-level contributor and administrator permissions.
- Cloud thumbnail generation and Firebase Cloud Messaging notifications.
- Full-screen media carousel powered by `yet-another-react-lightbox`.
- Light/dark themes via `next-themes` and a Workbox-powered service worker for generated static assets, fonts, and images.

## Prerequisites

- Node.js 18, 20, 22, or 24 for the root application.
- Node.js 24 for the `functionCron`, `functionNotify`, and `functionThumb` packages.
- npm.
- Firebase CLI, installed globally or invoked with `npx`.

## Installation

```bash
git clone https://github.com/mandrej/andrejevici.git
cd andrejevici
npm install
```

The application imports a local `src/config.ts` file for Firebase settings and application limits. That file is ignored by Git and must be provided by the project environment; do not commit local credentials or configuration.

## Local development

Start Firebase emulators in one terminal:

```bash
./ands run
```

Then start the Next.js development server in another:

```bash
npm run dev
```

Open <http://localhost:3000>. The development Firebase client connects to the Auth, Firestore, Storage, and Functions emulators. `./ands run` imports and exports local emulator state through `./data`; this directory is ignored and is not shipped as repository data.

To test the PWA service worker during development:

```bash
npm run dev:pwa
```

### Emulator ports

These ports are configured in `firebase.json`:

| Service           | Port |
| ----------------- | ---: |
| Auth              | 9099 |
| Firestore         | 8080 |
| Realtime Database | 9000 |
| Hosting           | 5000 |
| Storage           | 9199 |
| Functions         | 5001 |
| Emulator UI       | 4000 |
| Hub               | 4400 |
| Logging           | 4500 |

## Commands

### npm scripts

| Command           | Purpose                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run dev`     | Start the Next.js development server.                                                                            |
| `npm run dev:pwa` | Build the service worker and start development with PWA behavior enabled.                                        |
| `npm run build`   | Run `next build --webpack` and generate the PWA files.                                                           |
| `npm run start`   | Run the existing `next start` script. Firebase Hosting is the configured production path for this static export. |
| `npm run lint`    | Run ESLint.                                                                                                      |
| `npm run format`  | Format matching source, styles, Markdown, and JSON files with Prettier.                                          |
| `npm run icons`   | Generate icons and screenshots from `public/logo.svg`.                                                           |
| `npm test`        | Run TypeScript tests with `tsx --test`.                                                                          |

### `./ands`

| Command            | Purpose                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `./ands run`       | Start Firebase emulators with `./data` import/export.                |
| `./ands build`     | Update `NEXT_PUBLIC_BUILD` in `.env`, then run the production build. |
| `./ands deploy`    | Deploy Firebase Hosting only.                                        |
| `./ands indexes`   | Deploy Firestore indexes only.                                       |
| `./ands functions` | Build all three Cloud Function packages, then deploy functions.      |
| `./ands icons`     | Run the icon generation script.                                      |
| `./ands test`      | Run the targeted `npm test test/slug.ts` command.                    |

## Build and deployment

`next.config.ts` configures a static export:

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

Build the site with:

```bash
./ands build
```

or, without updating the build timestamp:

```bash
npm run build
```

The generated site is written to `dist/`. The PWA build script copies the manifest, bundles the custom worker, injects the Workbox precache manifest, writes `dist/sw.js`, and copies the generated worker to `public/sw.js`. Firebase Hosting is configured to serve `dist/` and rewrite unknown routes to `/index.html`.

Deploy Hosting with:

```bash
./ands deploy
```

`./ands deploy` deploys Hosting only. Cloud Functions are built and deployed separately with `./ands functions`.

## Routes and permissions

The current App Router routes are:

- `/` — home/gallery page.
- `/list` — gallery, search, filters, infinite scroll, and media details.
- `/add` — photo and video upload flow.
- `/admin` — metadata repair and user administration.
- `/401` — unauthorized page.
- `not-found` — not-found handling.

Anonymous visitors can browse and read. Firebase sign-in creates or loads a `User` document. Contributing requires a signed-in user with a non-empty nickname other than `???` and either `isAuthorized` or `isAdmin`. The `/admin` page additionally requires `isAdmin`; record edits and deletes are limited by the application to the uploader or an admin.

The first newly created user is initialized with elevated flags. Later users initially have no nickname and no contributor/admin flags until an administrator updates them. Session timestamps are checked against a 60-day limit, and the client listens to the active user document in real time. Push-token registration is conditional on the user's `allowPush` setting.

These are client-side permission gates. The current Firebase rules allow public reads and authenticated writes, so the deployed rules should be reviewed separately before treating them as role enforcement.

## Firebase data paths

The implementation uses these case-sensitive Firestore paths:

- `User` — user documents keyed by trimmed, lowercased email.
- `Photo` — photo and video metadata documents.
- `Counter` — metadata counter documents.
- `Bucket` — aggregate storage information, including `Bucket/total`.
- `Rename` — rename mappings used by metadata management.
- `LastRecord` — latest-record state.
- `User/{normalized-email}/Device` — FCM device-token subcollection.

Use the collection references in `src/helpers/collections.ts` when working in client code. Counter values are represented by `Counter` documents and the values store, not by separate lowercase collections.

## Image upload and publish

Uploading and publishing are two separate phases. Bytes go to Cloud Storage first; only later does a Firestore `Photo` document make the image public. An uploaded but unpublished file is invisible to the gallery and leaves an orphaned Storage object.

### Gate

`/add` redirects to `/401` unless `canContribute(user)` passes (`src/helpers/index.ts`): signed in, a non-empty nickname other than `???`, and either `isAuthorized` or `isAdmin`. The tab switch selects `PhotoTab` or `VideoTab`.

### Upload (bytes to Storage)

`PhotoTab` turns each selected file into an `uploadTask`:

1. The object name is `uuidv4().substring(0, 8)` plus `_` plus the original filename. This name becomes the record `id`, so the original filename is preserved inside it.
2. `uploadBytesResumable` transfers the original unchanged with `contentType: file.type` and `cacheControl: 'public, max-age=604800'`. Originals are never re-encoded.
3. An `UploadTracker` (`src/helpers/uploadTracker.ts`) wraps the task with atomic state transitions (`pending → uploading → completed/error/cancelled`), feeding `progressInfo` and the "Cancel all" action.
4. On completion the download URL is resolved and a partial `PhotoType` (`id`, `url`, `size`, `email`, `nick`, `kind`) is appended to `store.uploaded` — no EXIF, headline, or `thumb` yet. The presence or absence of `thumb` is what distinguishes an unpublished queue item from a live object throughout the code.
5. The local `File` is kept in `filesRef` and a `blob:` object URL is held in component state (never in the persisted store). Stale previews are revoked as records leave the queue.

Size (`CONFIG.fileSize`) and count (`CONFIG.fileMax`) are validated in `onFileChange` and `onDrop`. Failed uploads are returned to the pending `files` list so they can be retried.

### Thumbnails

On the normal photo path thumbnails come from the Storage trigger, not the client: `generateThumbnailOnUpload` in `functionThumb` fires on `onObjectFinalized`, uses a `thumbnailLocks` Firestore transaction for idempotency, and streams the source through sharp to write `thumbnails/<name>_400x400.jpeg` as a 400px square cover crop (progressive JPEG, quality 85). Because the trigger is asynchronous, `saveRecord` does not wait for it — production sets a predictive URL built from the bucket and path, while development tries the real `getDownloadURL` first and falls back to the predictive URL. Only the swap path attempts a client-side canvas thumbnail first and falls back to the callable.

### Publish (record to Firestore)

Publishing is triggered by "Publish all" / "Publish selected" or by the per-card edit action. Both converge on `completePhoto` and then `saveRecord`.

`completePhoto` enriches a queue entry. `readExif(source ?? rec.url)` prefers the local `File` so EXIF is parsed from the first few kilobytes instead of re-downloading the whole original. It extracts model and lens (resolving renames against the `Rename` collection), date components, aperture, shutter, ISO, focal length, flash, dimensions, and GPS. Date fields default to the upload time (`getDateFields(new Date())`); the EXIF `DateTimeOriginal` may overwrite them because `...exif` is spread after the date fields. The headline defaults to `CONFIG.noTitle`, `text` is `sliceSlug(headline)` for search prefixes, and a fired flash is folded into `tags`.

`saveRecord` branches on `obj.thumb`:

- **Has `thumb` — update path.** `setDoc(..., { merge: true })`, replace the record in `objects`, run `updateCounters(oldDoc, obj)`, and show an "updated" notification.
- **No `thumb` — publish path.** Assign `obj.thumb`, write `Photo/{id}` with `setDoc(..., { merge: true })`, apply `bucketDiff(obj.size)`, run `updateCounters(null, obj)`, remove the record from `uploaded`, log the `published` analytics event, move the gallery to the record's date via `set({ find })`, and call `fetchRecords(true)`. The `LastRecord` snapshot listener picks up the new record automatically.

The Firestore `Photo` document is what publishes the image.

### Publish side effects

- **Counters.** `updateCounters` diffs the counter keys derived from the `CONFIG.photo_filter` fields between the old and new record, then `batchUpdateCounters` writes `increment(±1)` to `Counter/<field>||<value>`, creating or deleting the document at zero and mirroring the change into the values store.
- **Bucket.** `bucketDiff(size)` adjusts the aggregate `{ size, count }` and writes `Bucket/total`.
- **Analytics.** A `published` event carries `when`, `who` (the local part of the email), `filename`, `headline`, and `kind`, loaded through a dynamic import of the analytics module.

### Video

`VideoTab` is a single-phase flow that uploads no bytes. It resolves a YouTube id, fetches the title through the oEmbed endpoint, and builds a record with `size: 0`. `saveVideo` sets `kind: 'video'`, derives the thumbnail from `img.youtube.com/vi/<id>/hqdefault.jpg`, writes the document, and updates counters. It does not call `bucketDiff`, because zero-byte videos do not affect bucket size.

### Swap

`swapRecord` replaces a file and is the only flow that uploads and publishes together. It is gated by `isAuthorOrAdmin`. It generates a new id, uploads the new bytes, produces and uploads a thumbnail (canvas, then callable, then predictive URL), reads EXIF from the new local `File`, and builds a new record that keeps the old headline, tags, and author. It then writes the new document, deletes the old document, and removes the old Storage object and thumbnail. Local state, counters, and the bucket are reconciled at the end. Because the new record is written before the old is deleted and Storage cleanup is best-effort, a failure mid-way can leave the new document plus the old orphaned object rather than a hole.

### Delete

`deleteRecord` removes the Firestore document together with the original and thumbnail Storage objects in a single `Promise.all` (Storage is skipped for videos), then reverses the counters and the bucket. It branches on `obj.thumb` the same way, so deleting an unpublished queue item never touches Storage — an uploaded but never-published file's bytes stay in Storage with no record pointing at them.

## Cloud Functions

- **`functionThumb`** exports the authenticated callable `generateThumbnail` and the Storage trigger `generateThumbnailOnUpload`. It creates a 400px square `fit: cover` progressive JPEG at quality 85 under `thumbnails/`, with an `_400x400.jpeg` suffix, and uses `thumbnailLocks` to prevent duplicate processing.
- **`functionCron`** exports `cronCounters`, which rebuilds `Counter` from `Photo`, and `cronBucket`, which writes aggregate photo count and size to `Bucket/total` every three days.
- **`functionNotify`** exposes the HTTP `notify` endpoint, sends multicast FCM notifications to the `Device` collection group, and removes failed token documents.

## Project structure

```text
src/
├── app/                 # App Router routes, root layout, ClientProviders, and lifecycle
├── components/          # UI components, atoms, layouts, search, and admin tools
├── stores/              # Zustand stores with subdirectories for slices, types, and selectors
├── helpers/             # Firebase references, devices, EXIF, models, permissions, and utilities
├── composables/         # Reusable UI hooks (infinite scroll, screen size)
├── hooks/               # Feature hooks (record editing)
├── firebase.ts          # Lazy Firebase client initialization and emulator wiring
├── messaging.ts         # Lazy Firebase Messaging (dynamically imported)
├── analytics.ts         # Lazy Firebase Analytics (dynamically imported)
└── styles/              # Global Tailwind stylesheet
src-pwa/                 # Custom Workbox service worker and manifest
functionCron/            # Scheduled counter and bucket maintenance (v2 API)
functionNotify/          # HTTP FCM notification function (v2 API)
functionThumb/           # Callable and Storage-triggered thumbnail functions (v2 API)
scripts/                 # PWA and icon build scripts
test/                    # TypeScript tests and fixture data
public/                  # Static assets, manifest, and messaging worker
ands                     # Project helper CLI
```

## PWA behavior

Production registers `/sw.js`. `npm run dev:pwa` enables the same registration path in development by setting `NEXT_PUBLIC_PWA_DEV=true`. Service-worker registration is deferred until the page is idle via `requestIdleCallback`. Workbox precaches generated static assets, caches Google Fonts with Cache First, and caches images with Stale While Revalidate. Firebase Messaging uses the separate `public/firebase-messaging-sw.js` worker referenced by the generated service worker.

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — concise assistant and developer quick reference.
- [`AGENTS.md`](./AGENTS.md) — detailed architecture, workflows, and contribution guidance.

## License

Private repository. All rights reserved.
