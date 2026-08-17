# CLAUDE.md

This file provides quick guidance and technical context for Claude Code (`claude.ai/code`) and AI development assistants working with the **Andrejevici** codebase.

---

## 🛠️ CLI & Development Commands

### Core Development Workflow

- **Dev server**: `npm run dev` (Starts Next.js 16 dev server on `http://localhost:3000`)
- **Dev server with PWA**: `npm run dev:pwa` (Builds PWA service worker and starts dev server with PWA flags)
- **Lint**: `npm run lint` (Executes ESLint flat configuration across TypeScript and React code)
- **Format**: `npm run format` (Formats code, markdown, and styles with Prettier)
- **Run Tests**: `npm test` (Executes TypeScript unit tests via `tsx`) or `./ands test` (Runs test suite)

### Firebase & Operations CLI (`./ands`)

| Command            | Action  | Description                                                                                                                    |
| :----------------- | :------ | :----------------------------------------------------------------------------------------------------------------------------- |
| `./ands run`       | Backend | Starts Firebase emulators (Auth: 9099, Firestore: 8080, Storage: 9199, Functions: 5001, UI: 4000) with `./data` import/export. |
| `./ands build`     | Build   | Injects `NEXT_PUBLIC_BUILD` timestamp into `.env` and compiles Next.js & PWA production package.                               |
| `./ands deploy`    | Deploy  | Deploys client application to Firebase Hosting.                                                                                |
| `./ands indexes`   | Deploy  | Deploys Firestore index definitions (`firestore.indexes.json`) to Cloud Firestore.                                             |
| `./ands functions` | Backend | Builds TypeScript source for `functionNotify`, `functionCron`, `functionThumb` and deploys Cloud Functions.                    |
| `./ands icons`     | Assets  | Re-generates application icons from `AppIcon.svg` via `node scripts/build-icons.js`.                                           |
| `./ands test`      | Quality | Runs TypeScript unit tests (`npm test test/slug.ts`).                                                                          |

---

## 🏛️ Architecture & Core Components

### Tech Stack & Core Libraries

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript 5.9 (Strict) + Tailwind CSS 4
- **UI Components**: `@headlessui/react` + `@heroicons/react` + `yet-another-react-lightbox`
- **Backend**: Firebase 11 (Firestore, Cloud Storage, Authentication, Cloud Functions, Cloud Messaging)
- **State Management**: Zustand 5 (Modular Slices)
- **Media & EXIF**: `exifreader` (client-side EXIF metadata parser) + `transliteration` (Serbian Cyrillic/Latin slugifier)
- **PWA Integration**: Workbox Build 7 + Custom Service Worker (`public/sw.js`)

### Project Layout

```
src/
├── app/                             # Next.js App Router views (/list, /add, /admin, /401)
├── components/                      # UI atoms, sidebars, toolbars, tabs, dialogs, cards
├── stores/                          # Zustand state stores (appStore, userStore, valuesStore, bucketStore, toastStore)
├── helpers/                         # Business logic & Firebase helpers (exif.ts, collections.ts, index.ts, remedy.ts)
├── firebase.ts                      # Firebase SDK initialization & emulator detection
├── config.ts                        # Central project credentials, limits, & EXIF tag definitions
└── styles/                          # Tailwind CSS 4 global styles (app.css)

functionCron/                        # Cloud Function: Scheduled background maintenance
functionNotify/                      # Cloud Function: Push notification delivery
functionThumb/                       # Cloud Function: Image thumbnail creation (_400x400.jpeg)
test/                                # Unit test suite executed via tsx
data/                                # Local Firebase emulator state export
ands                                 # Master project utility CLI script
```

---

## 📐 Coding Standards & Guidelines

1. **Language & Types**: Write strict TypeScript. Prefer explicit type definitions over `any`. Use type-only imports (`import type { ... }`).
2. **State Management**: Access Zustand 5 stores using granular selectors (e.g. `useUserStore((state) => state.user)`).
3. **Firestore Queries**: Always use pre-configured collection references from `src/helpers/collections.ts` rather than raw collection strings.
4. **Command Execution**: Execute package management commands (e.g. `npm install`, `npm uninstall`) synchronously in the foreground so dependencies resolve before downstream tasks.
5. **Formatting & Linting**: Always verify code changes with `npm run format` and `npm run lint`.
