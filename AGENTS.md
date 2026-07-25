# AGENTS.md

This file provides comprehensive guidance for WARP and AI agents working with the Andrejevici codebase.

## Project Overview

**Andrejevici** is a photo album web application for browsing, uploading, and managing photos with EXIF data extraction, tagging, searching, and admin capabilities.

**Tech Stack:**

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Headless UI + Heroicons
- **Backend**: Firebase (Firestore, Storage, Auth, Cloud Functions, Messaging)
- **State Management**: Zustand
- **Build**: Next.js Compiler + Webpack + Workbox (PWA)
- **Package Manager**: npm
- **Node Runtime**: ^24 || ^22 || ^20 || ^18

## Quick Start

### Installation & Setup

```bash
npm install                    # Install dependencies
./ands run                     # Start Firebase emulators with data import/export
npm run dev                    # Start Next.js dev server (in another terminal)
```

### Development Commands

- `npm run dev` - Start Next.js dev server with hot reload on port 3000
- `npm run lint` - Run ESLint on all source files
- `npm run format` - Format code with Prettier
- `npm test` - Run Node.js tests with tsx
- `npm test test/slug.ts` - Run a specific test file

### Build & Deployment

- `npm run build` - Build Next.js application & PWA bundle for production
- `./ands build` - Build with version timestamp in `.env`
- `./ands deploy` - Deploy to Firebase Hosting (excludes functions)
- `./ands functions` - Build and deploy Firebase Cloud Functions only
- `./ands icons` - Generate icons from `AppIcon.svg` using Inkscape

## Project Structure

### Source Code Layout (`src/`)

```
src/
├── app/                             # Next.js App Router pages & root layout
│   ├── layout.tsx                   # Root layout with ClientProviders & theme script
│   ├── page.tsx                     # Home page route entry
│   ├── HomePageContent.tsx          # Home page main content
│   ├── AppInitializer.tsx           # Global auth & state initialization
│   ├── ClientProviders.tsx          # Client side context providers
│   ├── not-found.tsx                # 404 page
│   ├── 401/                         # 401 Unauthorized page
│   ├── add/                         # Photo upload page (/add)
│   │   ├── page.tsx
│   │   ├── AddPhotoPageContent.tsx
│   │   └── AddVideoPageContent.tsx
│   ├── admin/                       # Admin management page (/admin)
│   │   ├── page.tsx
│   │   └── AdminPageContent.tsx
│   └── list/                        # Photo list/gallery browse page (/list)
│       ├── page.tsx
│       └── ListPageContent.tsx
├── firebase.ts                      # Firebase SDK initialization & emulator config
├── config.ts                        # Global configuration (credentials, limits, EXIF tags)
├── env.d.ts                         # TypeScript environment type definitions
├── components/
│   ├── atoms/                       # Base UI atoms (AppButton, AppIcon, AppInput, etc.)
│   ├── sidebar/                     # Navigation & management sidebars
│   │   ├── Sidebar.tsx              # Main navigation sidebar
│   │   ├── ManageSelection.tsx       # Photo selection management
│   │   ├── Menu.tsx                 # Navigation menu
│   │   └── SendMessage.tsx          # Messaging interface
│   ├── toolbar/                     # Page-specific toolbars
│   │   ├── ListToolbar.tsx          # Album list toolbar
│   │   ├── AddToolbar.tsx           # Upload page toolbar
│   │   └── AdminToolbar.tsx         # Admin page toolbar
│   ├── tab/                         # Photo detail & management tabs
│   │   ├── MetaTab.tsx              # Photo metadata editor
│   │   ├── PhotoTab.tsx             # Photo display
│   │   ├── UsersTab.tsx             # User permissions manager
│   │   ├── VideoTab.tsx             # Video preview
│   │   └── MessagesTab.tsx          # Messaging interface
│   ├── dialog/                      # Modal dialogs & lightboxes
│   │   ├── SwiperView.tsx           # Image carousel/lightbox
│   │   ├── EditPhotoRecord.tsx      # Photo record editing dialog
│   │   └── EditVideoRecord.tsx      # Video record editing dialog
│   ├── layouts/
│   │   ├── DefaultLayout.tsx        # Main layout (sidebar + toolbar + content)
│   │   └── PlainLayout.tsx          # Minimal layout (for home, login, 404)
│   ├── LocalSearch.tsx              # Client-side search component
│   ├── GlobalSearch.tsx             # Global search interface
│   ├── PictureCard.tsx              # Photo grid card component
│   ├── AutoComplete.tsx             # Auto-complete suggestions
│   ├── AdminCard.tsx                # Admin card component
│   ├── ErrorBanner.tsx              # Error display banner
│   ├── FileBroken.tsx               # Broken file indicator
│   └── TagsMerge.tsx                # Tag merging utility
├── stores/                          # Zustand state management (modular slices)
│   ├── appStore.ts                  # UI state (busy, modals, theme, search filters)
│   ├── userStore.ts                 # Authentication: user profile, permissions, FCM token
│   ├── valuesStore.ts               # Global filter data (tags, photographers, lenses, models)
│   ├── bucketStore.ts               # Firebase Storage bucket state
│   ├── toastStore.ts                # Toast notification system
│   ├── app/                         # App store slices (ui, records, photoOps)
│   ├── user/                        # User store slices (auth, notifications, admin)
│   ├── values/                      # Values store slices (counters, values)
│   ├── bucket/                      # Bucket store slice
│   └── toast/                       # Toast store slice
├── composables/                     # Custom hooks & composables
│   ├── useInfiniteScroll.ts         # Infinite scroll handler
│   └── useScreen.ts                 # Screen size helper
├── hooks/                           # Custom React hooks
│   └── useEditRecord.ts             # Record edit state hook
├── helpers/
│   ├── index.ts                     # Utility functions (date, slug, counter, search)
│   ├── exif.ts                      # EXIF data extraction (via exifreader)
│   ├── models.ts                    # TypeScript type definitions
│   ├── collections.ts               # Firestore collection references & queries
│   ├── notify.ts                    # Push notification handler
│   ├── remedy.ts                    # Data repair & cleanup utilities
│   └── uploadTracker.ts             # Upload progress tracking
└── styles/
    └── app.css                      # Global Tailwind CSS 4 styles & themes

public/                              # Static public assets & service worker
├── logo.svg                         # Logo SVG asset
├── sw.js                            # Built PWA service worker
└── manifest.json                    # PWA web app manifest
```

## Core Architecture

### State Management (Zustand)

Five main Zustand stores manage application state:

- **`stores/appStore.ts`** - UI state: busy flag, modals, theme, search filters, last viewed photo
- **`stores/userStore.ts`** - Authentication: current user, permissions, FCM token, push consent
- **`stores/valuesStore.ts`** - Global filter data: tags, photographers, lenses, camera models (synced from Firestore)
- **`stores/bucketStore.ts`** - Firebase Storage bucket state
- **`stores/toastStore.ts`** - Toast notifications

### Routing & Navigation

Routing is handled by Next.js App Router:

- `/` - Home page (`src/app/page.tsx` & `HomePageContent.tsx`)
- `/list` - Photo browse gallery & search (`src/app/list/page.tsx`)
- `/add` - Photo & video upload (`src/app/add/page.tsx`)
- `/admin` - Admin dashboard (`src/app/admin/page.tsx`)
- `/401` - Unauthorized access error page (`src/app/401/page.tsx`)

### Firebase Integration

**Emulator Configuration** (`firebase.json`):

- Auth: 9099
- Firestore: 8080
- Storage: 9199
- Functions: 5001
- Hub: 4400
- UI: 4000

**Security Rules:**

- `firestore.rules` - Firestore access control
- `storage.rules` - Cloud Storage access control

**Cloud Functions** (deployed from separate codebases):

- `functionNotify/` - Push notification handler
- `functionCron/` - Scheduled background tasks
- `functionThumb/` - Image resizing (uses Firebase Image Resize Extension)

**Indexes**: Defined in `firestore.indexes.json` for optimized queries

## Code Quality & Standards

### Linting & Formatting

**ESLint** (Flat config in `eslint.config.mjs`):

- Rules: `@eslint/js`, `@vue/eslint-config-typescript`, `@next/eslint-plugin-next`
- TypeScript type checking enabled
- Type imports enforced: `prefer: 'type-imports'`
- Debugger allowed in dev only

**Prettier** (config: `.prettierrc.json`):

- Line width: 100
- Single quotes
- No semicolons

### TypeScript

- **Strict mode**: Enabled in `tsconfig.json`
- **Target**: ES2022 / Next.js target

### Testing

- Framework: Node.js native `test` module with `assert/strict`
- Files: Located in `test/` directory
- Execution: `tsx` runner (Esbuild + TypeScript for Node)
- Examples: `test/slug.ts` (slug generation), `test/exif.ts` (EXIF extraction)

## Build Configuration

### Next.js & PWA Build

- **Build command**: `npm run build` (`next build --webpack && node scripts/build-pwa.js`)
- **PWA**: Workbox-based service worker generated via `scripts/build-pwa.js`
- **Service Worker**: `public/sw.js` handles runtime caching & push notifications

### Deployment (`firebase.json`)

- **Hosting**: Served via Firebase Hosting
- **Cache headers**:
  - Manifest: 1 day (must-revalidate)
  - Service workers: no-cache
- **Firestore indexes**: Auto-deployed with hosting

## Development Workflow

### 1. Start Firebase Emulators (Terminal 1)

```bash
./ands run
```

This starts emulators with automatic data import/export to `./data` directory.

### 2. Start Dev Server (Terminal 2)

```bash
npm run dev
```

Dev server connects to emulators (controlled by `process.env.DEV` checks in `src/firebase.ts`).

### 3. Write & Test Code

- Edit components, stores, helpers as needed
- Hot reload applies changes automatically
- Run tests: `npm test test/<file>.ts`
- Lint before commit: `npm run lint`
- Format code: `npm run format`

### 4. Deploy

```bash
./ands build    # Build with version timestamp
./ands deploy   # Deploy to Firebase Hosting
```

For Cloud Functions: `./ands functions`

## Key Implementation Notes

### Authentication & Notifications

- Firebase Auth with emulator support in dev
- FCM token refreshed post-login if user consented previously
- Push permission dialog triggered if login interval (config `loginDays`) elapsed
- Notification handler in `AppInitializer.tsx` displays in-app notifications

### Analytics Event Logging

Analytics events are logged using `logAnalyticsEvent` (defined in `src/firebase.ts`). The following key events are tracked:

- `'detailed_view'`: Logged when a user opens a photo in the carousel view (triggered by `carouselShow` in `src/app/list/page.tsx`).
- `'share'`: Logged when a user copies a link to share a photo (in `SwiperView.tsx`).
- `'image_download'`: Logged when a user downloads an image (in `SwiperView.tsx`).
- `'push_message'`: Logged when an admin sends a push message (in `SendMessage.tsx`).
- `'sign_in'`: Logged on user sign-in (in `userStore.ts`).
- `'published'`: Logged when a photo record is published or updated (in `appStore.ts`).
- `'image_delete'`: Logged when a photo is deleted (in `appStore.ts`).

### Photo Data Pipeline

1. **Upload**: Photo uploaded via `src/app/add/page.tsx`
2. **Completion**: `completePhoto()` (in `helpers/index.ts`) enriches photo with:
   - EXIF metadata: camera model, lens, focal length, ISO, aperture, exposure, flash
   - Timestamps & metadata
   - Searchable slug (via `transliteration` for Cyrillic/Latin)
   - Headline text field
3. **Thumbnail**: Generated and cached with `_400x400.jpeg` suffix
4. **Search**: Full-text search on slugified text across Cyrillic/Latin characters

### Firestore Data Model

**Collections** (refs in `src/helpers/collections.ts`):

- `photos` - Photo records with EXIF, tags, timestamps
- `users` - User profiles & permissions
- `tags`, `photographers`, `lenses`, `models` - Global filter values

**Photo Document Schema**:

```
{
  filename: string
  url: string
  size: number
  email: string          // uploader
  nick: string
  date: Timestamp
  year, month, day: number
  headline: string
  text: string           // slugified for search
  tags: string[]
  ... EXIF fields (camera, lens, ISO, etc.)
  kind: string
}
```

### Search & Filtering

- **LocalSearch.tsx**: Client-side search with tag/date/photographer filters
- **Query sanitization**: `fixQuery()` removes empty fields, normalizes data types
- **Filter criteria**: Defined by `photo_filter` in `config.ts`
- **Firestore queries**: Optimized with indexes for filtered/paginated results

## Debugging & Troubleshooting

### Firebase Emulator

- **UI Dashboard**: http://localhost:4000
- **Inspect data**: Use Firestore tab in emulator UI
- **Export data**: `./ands run` auto-exports on exit to `./data`
- **Reset data**: Delete `./data` directory before starting emulators

### Dev Server

- **Port**: 3000 (Next.js default)
- **TypeScript errors**: Shown in terminal and overlaid in browser

### Tests

```bash
npm test                      # Run all tests
npm test test/slug.ts         # Test slug generation
npm test test/exif.ts         # Test EXIF extraction
```

## Useful Patterns & Tips

1. **Store access**: Import Zustand stores directly (e.g., `useUserStore((state) => state.user)`)
2. **Firestore queries**: Use helpers in `collections.ts` (pre-built query refs)
3. **EXIF extraction**: `extractExif()` in `helpers/exif.ts` returns structured metadata
4. **Icons**: **Heroicons** (`@heroicons/react`) or Google Material Symbols
5. **Error handling**: Use `errorBanner` or `useToastStore` for user-facing errors
6. **Command Execution Rules**: Always run package management commands (like `npm install` and `npm uninstall`) in the foreground (synchronously, with a high `WaitMsBeforeAsync` value or no background scheduling) to ensure completion before dependent tasks start.

## Environment & Configuration

- **`.env`**: Auto-generated by `./ands build` with `ANDREJEVICI_BUILD` timestamp
- **`src/config.ts`**: Central config for Firebase credentials, limits, URL patterns, EXIF tag filters
- **`process.env.DEV`**: Used to detect emulator vs. production Firebase

## Common Issues & Solutions

| Issue                            | Solution                                                                   |
| -------------------------------- | -------------------------------------------------------------------------- |
| "Cannot find module"             | Run `npm install`                                                          |
| Emulator won't start             | Check ports 9099, 8080, 5001 are free; kill lingering `firebase` processes |
| Data lost after emulator restart | `./data` export may be corrupted; delete and start fresh                   |
| Hot reload not working           | Verify Next.js dev server is running on port 3000                          |
| Linting errors block dev         | Run `npm run format` to auto-fix most issues                               |
| Tests fail with module errors    | Ensure `tsx` is installed (dev dependency); try `npm install`              |
