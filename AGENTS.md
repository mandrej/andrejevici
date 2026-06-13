# AGENTS.md

This file provides comprehensive guidance for WARP and AI agents working with the Andrejevici codebase.

## Project Overview

**Andrejevici** is a photo album web application for browsing, uploading, and managing photos with EXIF data extraction, tagging, searching, and admin capabilities.

**Tech Stack:**
- **Frontend**: Vue 3 + TypeScript + Quasar 2 (PWA)
- **Backend**: Firebase (Firestore, Storage, Auth, Functions, Messaging)
- **Build**: Vite + TypeScript
- **Package Manager**: npm
- **Node Runtime**: ^22 || ^20 || ^18

## Quick Start

### Installation & Setup

```bash
npm install                    # Install dependencies (auto-runs quasar prepare)
./ands run                     # Start Firebase emulators with data import/export
npm run dev                    # Start Quasar dev server (in another terminal)
```

### Development Commands

- `npm run dev` - Start Quasar dev server with hot reload on port 5173
- `npm run lint` - Run ESLint on all source files
- `npm run format` - Format code with Prettier
- `npm test` - Run Node.js tests with tsx
- `npm test test/slug.ts` - Run a specific test file

### Build & Deployment

- `npm run build` - Build PWA for production
- `./ands build` - Build with version timestamp in `.env`
- `./ands deploy` - Deploy to Firebase Hosting (excludes functions)
- `./ands functions` - Build and deploy Firebase Cloud Functions only
- `./ands icons` - Generate icons from `AppIcon.svg` using Inkscape

## Project Structure

### Source Code Layout (`src/`)

```
src/
├── App.vue                          # Root component with auth & messaging setup
├── firebase.ts                      # Firebase SDK initialization & emulator config
├── config.ts                        # Global configuration (credentials, limits, EXIF tags)
├── env.d.ts                         # TypeScript environment type definitions
├── components/
│   ├── sidebar/                     # Navigation & management sidebars
│   │   ├── Sidebar.vue              # Main navigation sidebar
│   │   ├── ManageSelection.vue       # Photo selection management
│   │   ├── Menu.vue                 # Navigation menu
│   │   └── SendMessage.vue          # Messaging interface
│   ├── toolbar/                     # Page-specific toolbars
│   │   ├── ListToolbar.vue          # Album list toolbar
│   │   ├── AddToolbar.vue           # Upload page toolbar
│   │   └── AdminToolbar.vue         # Admin page toolbar
│   ├── tab/                         # Photo detail & management tabs
│   │   ├── MetaTab.vue              # Photo metadata editor
│   │   ├── PhotoTab.vue             # Photo display
│   │   ├── UsersTab.vue             # User permissions manager
│   │   ├── VideoTab.vue             # Video preview
│   │   └── MessagesTab.vue          # Messaging interface
│   ├── dialog/                      # Modal dialogs
│   │   ├── SwiperView.vue           # Image carousel/swiper
│   │   └── EditRecord.vue           # Record editing dialog
│   ├── LocalSearch.vue              # Client-side search component
│   ├── GlobalSearch.vue             # Global search interface
│   ├── PictureCard.vue              # Photo grid card component
│   ├── AutoComplete.vue             # Auto-complete suggestions
│   ├── AdminCard.vue                # Admin card component
│   ├── ErrorBanner.vue              # Error display banner
│   ├── FileBroken.vue               # Broken file indicator
│   └── TagsMerge.vue                # Tag merging utility
├── layouts/
│   ├── Default.vue                  # Main layout (sidebar + toolbar + content)
│   └── Plain.vue                    # Minimal layout (for login, etc.)
├── pages/
│   ├── IndexPage.vue                # Home page
│   ├── ListPage.vue                 # Album browse & filter
│   ├── AddPage.vue                  # Photo upload page
│   ├── AdminPage.vue                # Admin management page
│   └── ErrorPage.vue                # 401/404 error page
├── router/
│   ├── index.ts                     # Router setup & initialization
│   └── routes.ts                    # Route definitions with auth guards
├── stores/                          # Pinia state management
│   ├── index.ts                     # Store initialization
│   ├── app.ts                       # UI state (busy, modals, theme)
│   ├── user.ts                      # Auth state & user data
│   ├── values.ts                    # Global filter values (tags, lenses, etc.)
│   └── bucket.ts                    # Storage bucket state
├── helpers/
│   ├── index.ts                     # Utility functions (date, slug, counter, search)
│   ├── exif.ts                      # EXIF data extraction (via exifreader)
│   ├── models.ts                    # TypeScript type definitions
│   ├── collections.ts               # Firestore collection references & queries
│   ├── notify.ts                    # Push notification handler
│   ├── remedy.ts                    # Data repair & cleanup utilities
│   └── uploadTracker.ts             # Upload progress tracking
└── css/
    └── app.scss                     # Global styles

src-pwa/                            # PWA-specific files
├── custom-service-worker.ts         # Service worker (Workbox + Firebase Messaging)
├── register-service-worker.ts       # Service worker registration
├── manifest.json                    # PWA manifest
└── tsconfig.json                    # Service worker TypeScript config
```

## Core Architecture

### State Management (Pinia)

Four main stores manage application state:

- **`stores/app.ts`** - UI state: busy flag, notifications, modals, theme, last viewed photos
- **`stores/user.ts`** - Authentication: current user, permissions, FCM token, push notification consent
- **`stores/values.ts`** - Global filter data: tags, photographers, lenses, camera models (synced from Firestore)
- **`stores/bucket.ts`** - Firebase Storage bucket state

### Routing & Guards

Routes defined in `src/router/routes.ts` with auth guards:
- `requiresAuth` - User must be authenticated
- `requiresAdmin` - User must have admin role

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

**ESLint** (Flat config in `eslint.config.js`):
- Rules: `@eslint/js`, `@vue/eslint-config-typescript`, `eslint-plugin-vue`
- TypeScript type checking enabled
- Type imports enforced: `prefer: 'type-imports'`
- Component naming: Multi-word required (exceptions: App, Default, Plain, Menu, Sidebar)
- Debugger allowed in dev only

**Prettier** (config: `.prettierrc.json`):
- Line width: 100
- Single quotes
- No semicolons

### TypeScript

- **Strict mode**: Enabled in `quasar.config.ts`
- **Vue shim**: Enabled for `.vue` component typing
- **Target**: ES2022 (browser), Node 20 (Node target)

### Testing

- Framework: Node.js native `test` module with `assert/strict`
- Files: Located in `test/` directory
- Execution: `tsx` runner (Esbuild + TypeScript for Node)
- Examples: `test/slug.ts` (slug generation), `test/exif.ts` (EXIF extraction)

## Build Configuration

### Vite Build (`quasar.config.ts`)

- **Code splitting**: Firebase and Quasar in separate chunks
- **Plugins**: `vite-plugin-checker` for type checking and linting during dev
- **PWA**: Workbox-based GenerateSW mode with runtime caching
- **Runtime caching strategies**:
  - Google Fonts: `CacheFirst` (1 year TTL)
  - Images: `StaleWhileRevalidate` (30 day TTL)
- **Service Worker**: Integrates Firebase Messaging + Workbox

### Deployment (`firebase.json`)

- **Hosting**: `dist/pwa` directory served as public
- **SPA routing**: All requests rewritten to `index.html`
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
- Message handler in `App.vue` displays in-app notifications

### Photo Data Pipeline

1. **Upload**: Photo uploaded via `AddPage.vue`
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

- **LocalSearch.vue**: Client-side search with tag/date/photographer filters
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

- **Port**: 5173 (Quasar default)
- **TypeScript errors**: Shown in terminal and overlaid in browser
- **Linting errors**: Real-time feedback via `vite-plugin-checker`

### Tests

```bash
npm test                      # Run all tests
npm test test/slug.ts         # Test slug generation
npm test test/exif.ts         # Test EXIF extraction
```

## Useful Patterns & Tips

1. **Store access**: Import stores and use directly (e.g., `userStore.currentUser`)
2. **Firestore queries**: Use helpers in `collections.ts` (pre-built query refs)
3. **EXIF extraction**: `extractExif()` in `helpers/exif.ts` returns structured metadata
4. **Component naming**: Multi-word except App, Default, Plain, Menu, Sidebar
5. **Icons**: `material-symbols-rounded` in Quasar (auto-loaded)
6. **Error handling**: Use `errorBanner` from app store for user-facing errors

## Environment & Configuration

- **`.env`**: Auto-generated by `./ands build` with `ANDREJEVICI_BUILD` timestamp
- **`src/config.ts`**: Central config for Firebase credentials, limits, URL patterns, EXIF tag filters
- **`process.env.DEV`**: Used to detect emulator vs. production Firebase

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Run `npm install` and `quasar prepare` |
| Emulator won't start | Check ports 9099, 8080, 5001 are free; kill lingering `firebase` processes |
| Data lost after emulator restart | `./data` export may be corrupted; delete and start fresh |
| Hot reload not working | Verify Quasar dev server is running on port 5173 |
| Linting errors block dev | Run `npm run format` to auto-fix most issues |
| Tests fail with module errors | Ensure `tsx` is installed (dev dependency); try `npm install` |
