# Andrejevici

Andrejevici is a photo and video album Progressive Web App for browsing, searching, uploading, tagging, and managing media. It uses Next.js, React, TypeScript, Firebase, Zustand, and Workbox.

## Features

- Gallery browsing with search, metadata filters, infinite scrolling, and a full-screen media view.
- Photo and video uploads with client-side EXIF extraction for supported images.
- Transliteration and normalized search text for Cyrillic and Latin input.
- Metadata editing, tag management, and administrator repair tools.
- Firebase Authentication with application-level contributor and administrator permissions.
- Cloud thumbnail generation and Firebase Cloud Messaging notifications.
- Light/dark themes and a Workbox-powered service worker for generated static assets, fonts, and images.

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
  output: 'export',
  distDir: 'dist',
  images: { unoptimized: true }
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

## Cloud Functions

- **`functionThumb`** exports the authenticated callable `generateThumbnail` and the Storage trigger `generateThumbnailOnUpload`. It creates a 400px square `fit: cover` progressive JPEG at quality 85 under `thumbnails/`, with an `_400x400.jpeg` suffix, and uses `thumbnailLocks` to prevent duplicate processing.
- **`functionCron`** exports `cronCounters`, which rebuilds `Counter` from `Photo`, and `cronBucket`, which writes aggregate photo count and size to `Bucket/total` every three days.
- **`functionNotify`** exposes the HTTP `notify` endpoint, sends multicast FCM notifications to the `Device` collection group, and removes failed token documents.

## Project structure

```text
src/
├── app/                 # App Router routes, root layout, and lifecycle
├── components/          # UI components, atoms, layouts, search, and admin tools
├── stores/              # Zustand stores and modular slices
├── helpers/             # Firebase references, EXIF, models, permissions, and utilities
├── composables/         # Reusable UI hooks
├── hooks/               # Feature hooks such as record editing
├── firebase.ts          # Firebase client initialization and emulator wiring
└── styles/              # Global Tailwind stylesheet
src-pwa/                 # Custom Workbox service worker and manifest
functionCron/            # Scheduled counter and bucket maintenance
functionNotify/          # HTTP FCM notification function
functionThumb/           # Callable and Storage-triggered thumbnail functions
scripts/                 # PWA and icon build scripts
test/                    # TypeScript tests and fixture data
public/                  # Static assets, manifest, and messaging worker
ands                    # Project helper CLI
```

## PWA behavior

Production registers `/sw.js`. `npm run dev:pwa` enables the same registration path in development by setting `NEXT_PUBLIC_PWA_DEV=true`. Workbox precaches generated static assets, caches Google Fonts with Cache First, and caches images with Stale While Revalidate. Firebase Messaging uses the separate `public/firebase-messaging-sw.js` worker referenced by the generated service worker.

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — concise assistant and developer quick reference.
- [`AGENTS.md`](./AGENTS.md) — detailed architecture, workflows, and contribution guidance.

## License

Private repository. All rights reserved.
