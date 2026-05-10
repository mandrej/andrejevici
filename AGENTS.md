# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Andrejevici is a photo album web application built with:

- **Frontend**: Vue 3 + TypeScript + Quasar 2 (PWA)
- **Backend**: Firebase (Firestore, Storage, Auth, Functions, Messaging)
- **Build**: Vite + TypeScript
- **Testing**: Node.js test module

The app allows users to browse, upload, and manage photos with EXIF data extraction, tagging, searching, and admin capabilities.

## Common Commands

### Development

- `npm install` - Install dependencies (includes `quasar prepare`)
- `npm run dev` - Start Quasar dev server with hot reload: `quasar dev -m pwa`
- `./ands run` - Start Firebase emulators with data import/export: `firebase emulators:start --import ./data --export-on-exit ./data`

### Building & Deployment

- `npm run build` - Build PWA for production: `quasar build -m pwa`
- `./ands build` - Build with version timestamp in .env: sets `ANDREJEVICI_BUILD` and calls `quasar build -m pwa`
- `./ands deploy` - Deploy to Firebase Hosting (excludes functions): `firebase deploy --except functions,extensions`
- `./ands functions` - Build and deploy Firebase functions only

### Code Quality

- `npm run lint` - ESLint with flat config (checks `src/**/*.{ts,js,cjs,mjs,vue}`)
- `npm run format` - Prettier formatting for all code and config files

### Testing

- `npm test` - Run Node tests with tsx (uses native Node test module)
- `npm test test/slug.ts` - Run specific test file
- Tests are in `test/` directory using Node's `test` module and `assert/strict`

### Icon & Asset Generation

- `./ands icons` - Generate icons from AppIcon.svg using Inkscape and @quasar/icongenie

## Architecture

### Core Structure

- `src/App.vue` - Root component; initializes Firebase auth listener, FCM messaging handler, and state
- `src/firebase.ts` - Firebase SDK initialization and emulator configuration
- `src/config.ts` - Global config (Firebase credentials, limits, URLs, EXIF tags, etc.)
- `src/router/routes.ts` - Route definitions with layout components and auth guards (requiresAuth, requiresAdmin)

### State Management (Pinia)

- `src/stores/app.ts` - UI state (busy flag, error messages, modals, last photos, theme)
- `src/stores/user.ts` - Auth state (current user, permissions, FCM token management, push notification consent)
- `src/stores/values.ts` - Global values (tags, photographers, lenses, models from Firestore collection)

### Pages & Layouts

- Pages in `src/pages/`: IndexPage (home), ListPage (album browse), AddPage (upload), AdminPage (management), ErrorPage (401/404)
- Layouts in `src/layouts/`: Plain (simple), Default (with sidebar and toolbar)
- Sidebar components in `src/components/sidebar/`: navigation, filters (ListSidebar), menus (DefaultSidebar, Menu)
- Toolbar components in `src/components/toolbar/`: action buttons for each page
- Tab components in `src/components/tab/`: MetaTab (photo details), UsersTab (permissions), VideoTab, MessagesTab

### Helpers

- `src/helpers/index.ts` - Utility functions: date formatting, slug generation for search, thumbnail naming, counter IDs, photo completion (adds EXIF), search query sanitization
- `src/helpers/exif.ts` - EXIF data extraction using exifreader
- `src/helpers/models.ts` - TypeScript type definitions (PhotoType, MyUserType, FindType)
- `src/helpers/collections.ts` - Firestore collection references and queries
- `src/helpers/notify.ts` - Push notification handler
- `src/helpers/remedy.ts` - Data repair/cleanup utilities

### Firebase Integration

- Service accounts & rules: `firestore.rules`, `storage.rules`
- Emulator config in `firebase.json` with ports (Auth 9099, Firestore 8080, Storage 9199, Functions 5001)
- Cloud Functions deployed from three codebases:
  - `functionNotify/` - Handles push notifications
  - `functionCron/` - Scheduled tasks
  - `functionThumb/` - Image resizing (uses Firebase Extension for image-resize)

### Build Configuration

- `quasar.config.ts` - Quasar framework config with PWA settings, Vite plugins (vite-plugin-checker for type checking)
- Service Worker: `src-pwa/custom-service-worker.ts` (integrates Workbox + Firebase Messaging)
- `tsconfig.json` - Extends `.quasar/tsconfig.json`

## Code Style & Linting

- **ESLint**: Flat config in `eslint.config.js` using `@vue/eslint-config-typescript` with strict TypeScript checks
- **Prettier**: Line width 100, single quotes, no semicolons
- Type imports enforced: `prefer: 'type-imports'`
- Component naming: multi-word required except for App, Default, Plain, Menu

## Development Workflow

1. Start Firebase emulators: `./ands run` (in one terminal)
2. Start Quasar dev server: `npm run dev` (in another terminal)
3. Dev mode connects to emulators (see `src/firebase.ts` for `process.env.DEV` checks)
4. Lint before committing: `npm run lint && npm run format`
5. Run tests: `npm test test/slug.ts` (test slug generation) or `npm test test/exif.ts` (EXIF extraction)

## Key Implementation Notes

### Authentication & Push Notifications

- Firebase Auth with emulator support in dev
- FCM token refreshed after login if user previously consented
- Push permission dialog shown if login interval (CONFIG.loginDays) elapsed
- Message handler in App.vue displays notifications in-app

### Photo Data Pipeline

- Uploaded photos completed with `completePhoto()`: adds EXIF (camera model, lens, focal length, ISO, aperture, exposure, flash), timestamps, headline, searchable text (slug)
- Slugified headlines stored in `text` field for full-text search across Cyrillic/Latin characters
- Thumbnail generated and cached separately in storage bucket with suffix `_400x400.jpeg`

### Firestore Data Model

- Collections referenced in `src/helpers/collections.ts`
- Photo records include: filename, url, size, email (uploader), nick, date, year, month, day, headline, tags, EXIF fields, kind
- Global values collection for filters: tags, photographers, lenses, models

### Search & Filtering

- Local search via `GlobalSearch.vue` component
- Query sanitization in `fixQuery()`: removes empty fields, casts date fields to numbers, normalizes tags
- Search criteria define by `photo_filter` in config

## Deployment Notes

- Production build: `./ands build` (sets version timestamp)
- Hosting config in `firebase.json`: dist/pwa served as public, rewrites to index.html for SPA routing
- Cache headers: manifest files (1 day, must-revalidate), service workers (no-cache)
- Image resize extension configured via environment (see README.md for extension setup)
