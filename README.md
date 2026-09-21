# 📸 Andrejevici — Modern Photo & Video Album PWA

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-11-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![PWA](https://img.shields.io/badge/PWA-Workbox-5A0FC8?style=flat-square&logo=pwa)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

**Andrejevici** is a feature-rich, high-performance web application for browsing, uploading, tagging, searching, and managing photo & video albums. Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS 4**, and **Firebase**, it is fully optimized as a Progressive Web App (PWA) for desktop and mobile devices.

---

## ✨ Key Features

- 🖼️ **Interactive Gallery & Lightbox**: Dynamic gallery layout with full-screen lightbox preview (`yet-another-react-lightbox`), zoom support, and smooth touch gestures.
- 📷 **Automatic EXIF Parsing**: Client-side metadata extraction (`exifreader`) including camera model, lens specs, focal length, ISO, aperture, exposure time, and flash status.
- 🔍 **Smart Search & Transliteration**: Bi-lingual full-text search across Cyrillic and Latin alphabets powered by automated slug generation and tag indexing.
- 🏷️ **Tagging & Metadata Filtering**: Multi-dimensional filtering by custom tags, upload date ranges, photographers, camera bodies, and lens models.
- ⚡ **PWA & Offline Capability**: Service worker caching powered by Workbox, web manifest integration, and installable app capabilities.
- 📤 **Multi-File Upload & Cloud Processing**: Media upload flow with automatic cloud-based thumbnail generation (`400x400` thumbnails via the `functionThumb` Cloud Function).
- 🔐 **Role-Based Auth & Admin Portal**: Firebase Authentication integration with administrative tools for photo curation, user rights management, and tag merging.
- 🔔 **Push Notifications**: Firebase Cloud Messaging (FCM) integration for real-time mobile and browser notifications.
- 🎨 **Dark & Light Mode**: Built-in dark and light UI themes powered by `next-themes` and Tailwind CSS 4.

---

## 🛠️ Tech Stack

| Domain               | Technology                                                                                                                                                                                         |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**        | [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)                                                                                                                    |
| **Language**         | [TypeScript 5.9](https://www.typescriptlang.org/)                                                                                                                                                  |
| **Styling**          | [Tailwind CSS 4](https://tailwindcss.com/) + [@headlessui/react](https://headlessui.com/) + [@heroicons/react](https://heroicons.com/) + [next-themes](https://github.com/pacocoursey/next-themes) |
| **State Management** | [Zustand 5](https://github.com/pmndrs/zustand) (Modular Slices)                                                                                                                                    |
| **Backend & Cloud**  | [Firebase 11](https://firebase.google.com/) (Firestore, Storage, Auth, Cloud Functions, Messaging)                                                                                                 |
| **Media Processing** | [ExifReader](https://github.com/mattiasw/ExifReader) + `yet-another-react-lightbox`                                                                                                                |
| **PWA & Offline**    | Workbox Build 7 + Custom Service Worker                                                                                                                                                            |
| **Build & Tooling**  | Webpack + `tsx` test runner + ESLint 9 + Prettier                                                                                                                                                  |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your environment:

- **Node.js**: `^24 || ^22 || ^20 || ^18`
- **npm**: `>= 6.13.4`
- **Firebase Tools**: Installed globally (`npm install -g firebase-tools`) or invoked via `npx`

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/mandrej/andrejevici.git
   cd andrejevici
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

### Local Development

For full local development with database emulator support:

1. **Start Backend Emulators** (Terminal 1):

   ```bash
   ./ands run
   ```

   _Starts Firebase emulators (Auth, Firestore, Storage, Functions) with local state preserved in `./data`._

2. **Start Next.js Frontend** (Terminal 2):

   ```bash
   npm run dev
   ```

   _Open [http://localhost:3000](http://localhost:3000) in your browser._

   > **Note**: To test PWA features locally, run `npm run dev:pwa` instead.

---

## 💻 Helper Script & Development Commands

The repository includes a custom helper CLI script [`./ands`](./ands) to streamline common backend, build, testing, asset, and deployment workflows.

### Project Utility Commands (`./ands`)

| Command            | Category    | Executed Operation / Action                                                                   | Description                                                                                                             |
| :----------------- | :---------- | :-------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| `./ands run`       | **Backend** | `firebase emulators:start --import ./data --export-on-exit ./data`                            | Launches Firebase Local Emulators for Auth, Firestore, Storage, & Functions with persistent data in `./data`.           |
| `./ands build`     | **Build**   | Timestamp update in `.env` + `npm run build`                                                  | Injects current `NEXT_PUBLIC_BUILD` timestamp into `.env`, compiles Next.js frontend with Webpack, & builds PWA bundle. |
| `./ands deploy`    | **Deploy**  | `firebase deploy --only hosting`                                                              | Deploys compiled client application to Firebase Hosting (hosting only; excludes Cloud Functions).                       |
| `./ands indexes`   | **Deploy**  | `firebase deploy --only firestore:indexes`                                                    | Deploys updated Firestore index configuration (`firestore.indexes.json`) to Cloud Firestore.                            |
| `./ands functions` | **Deploy**  | Builds `functionNotify`, `functionCron`, `functionThumb` + `firebase deploy --only functions` | Compiles TypeScript source for all Cloud Functions & deploys them to Firebase.                                          |
| `./ands icons`     | **Assets**  | `npm run icons` (`node scripts/build-icons.js`)                                               | Generates all PWA web app icons and favicons from `logo.svg`.                                                           |
| `./ands test`      | **Quality** | `npm test test/slug.ts`                                                                       | Executes unit test suite for slug generation, EXIF parsing, date formatting, and utilities.                             |

### NPM Scripts (`npm run <script>`)

| Script            | Command                                                          | Purpose & Description                                                            |
| :---------------- | :--------------------------------------------------------------- | :------------------------------------------------------------------------------- |
| `npm run dev`     | `next dev`                                                       | Start Next.js development server on port 3000 with Hot Module Replacement (HMR). |
| `npm run dev:pwa` | `node scripts/build-pwa.js && NEXT_PUBLIC_PWA_DEV=true next dev` | Build PWA service worker and start dev server with PWA runtime caching enabled.  |
| `npm run build`   | `next build --webpack && node scripts/build-pwa.js`              | Compile production Next.js build and generate Workbox PWA service worker bundle. |
| `npm run start`   | `next start`                                                     | Launch Next.js production server for built application.                          |
| `npm run lint`    | `eslint .`                                                       | Run ESLint across all JavaScript, TypeScript, and React source files.            |
| `npm run format`  | `prettier --write ...`                                           | Format all source, style, markdown, and JSON files using Prettier.               |
| `npm test`        | `tsx --test`                                                     | Execute TypeScript test suite using native Node.js test runner via `tsx`.        |
| `npm run icons`   | `node scripts/build-icons.js`                                    | Generate PWA icons, favicons & screenshots from `logo.svg` using `sharp`.        |

---

## 📂 Project Structure

```
andrejevici/
├── src/                             # Next.js App Router & Application Source
│   ├── app/                         # App Router pages, layouts, and routing
│   │   ├── add/                     # Photo & video upload pages
│   │   ├── admin/                   # Admin dashboard & management pages
│   │   ├── list/                    # Gallery view & search page
│   │   ├── layout.tsx               # Root layout & client providers
│   │   └── page.tsx                 # Home page entry
│   ├── components/                  # React UI Components
│   │   ├── atoms/                   # Atomic UI controls (buttons, inputs, dialogs)
│   │   └── layouts/                 # Page wrapper layouts
│   ├── stores/                      # Zustand State Management
│   │   ├── appStore.ts              # UI state, active filters, search criteria
│   │   ├── userStore.ts             # Auth state, permissions, FCM tokens
│   │   ├── valuesStore.ts           # Global filters (tags, photographers, lenses)
│   │   ├── bucketStore.ts           # Storage bucket state
│   │   └── toastStore.ts            # Toast notifications
│   ├── helpers/                     # Business Logic & Utilities
│   │   ├── exif.ts                  # EXIF extraction parser
│   │   ├── collections.ts           # Firestore collection refs & queries
│   │   └── index.ts                 # Transliteration & utility helpers
│   └── styles/                      # Tailwind CSS global styles
├── functionCron/                    # Scheduled Cloud Function tasks
├── functionNotify/                  # Push Notification Cloud Function
├── functionThumb/                   # Thumbnail processing Cloud Function
├── test/                            # TypeScript unit tests (slug parsing, EXIF extraction)
├── data/                            # Firebase Emulator exported state data
├── public/                          # Static assets, manifest, service worker (`sw.js`)
├── scripts/                         # Build scripts (`build-pwa.js`, `build-icons.js`)
└── ands                             # Repository master CLI script
```

---

## ⚙️ Advanced Setup & Infrastructure

### Firebase Emulator Configuration

Local emulators map to the following ports during `./ands run`:

| Service               | Port   | UI Dashboard                                   |
| :-------------------- | :----- | :--------------------------------------------- |
| **Emulator Suite UI** | `4000` | [http://localhost:4000](http://localhost:4000) |
| **Firestore**         | `8080` | Managed via UI                                 |
| **Auth**              | `9099` | Managed via UI                                 |
| **Storage**           | `9199` | Managed via UI                                 |
| **Functions**         | `5001` | Managed via UI                                 |

### Cloud Storage Image Resizing

Automatic thumbnail generation relies on the `functionThumb` Cloud Function (`sharp` resizing via Storage trigger), configured with:

- **Bucket**: `andrejevici.appspot.com`
- **Output Dimensions**: `400x400` (`fit: cover`, JPEG quality 85, progressive)
- **Suffix**: `_400x400.jpeg`
- **Output Prefix**: `thumbnails/`
- **Cache-Control**: `public, max-age=604800`

### Docker Environment

You can also run Firebase emulators in isolated Docker environments using the pre-configured `andreysenov/firebase-tools` image:

```bash
docker run -dit \
  -p 9199:9199 -p 9099:9099 -p 9000:9000 -p 8080:8080 -p 5001:5001 -p 5000:5000 -p 4000:4000 \
  -v $(pwd):/project \
  -v $(pwd)/data:/data \
  -w /project \
  --name firebase-tools \
  andreysenov/firebase-tools:latest-node-22 \
  firebase emulators:start --import /data
```

---

## 🔐 User Workflow & Permissions

### Role Hierarchy

Every authenticated user has a document in the `users` Firestore collection (`MyUserType`). Three boolean flags govern what they can do:

| Flag           | Default for new users         | Meaning                                                                               |
| :------------- | :---------------------------- | :------------------------------------------------------------------------------------ |
| `isAdmin`      | `false` (first user → `true`) | Full administrative access — user management, tag merging, any photo/video operation. |
| `isAuthorized` | `false` (first user → `true`) | Editor access — can upload, edit their own media, and use batch tools.                |
| `allowPush`    | `false` (first user → `true`) | User has consented to receive FCM push notifications.                                 |

> **First-user bootstrap**: When the `users` collection is empty (fresh installation), the very first sign-in automatically receives `isAdmin: true`, `isAuthorized: true`, and `allowPush: true`.

### The `canContribute` Gate

A single helper function [`canContribute(user)`](./src/helpers/index.ts) is the **single source of truth** for write/upload permissions. It returns `true` only when **all** of the following conditions hold:

1. The user is authenticated (non-null).
2. The user has a **known, non-empty nickname** (`nick` is set and is not `'???'`).
3. The user holds either `isAuthorized` or `isAdmin` flag.

This gate is enforced uniformly across the application:

| Location                                                  | Behavior when `canContribute` returns `false`       |
| :-------------------------------------------------------- | :-------------------------------------------------- |
| [`Menu`](./src/components/Menu.tsx)                       | Upload nav link is hidden                           |
| [`PlainLayout`](./src/components/layouts/PlainLayout.tsx) | Upload action buttons are hidden                    |
| [`AddPageContent`](./src/app/add/AddPageContent.tsx)      | Upload page redirects / shows access-denied message |
| [`ManageSelection`](./src/components/ManageSelection.tsx) | Batch selection toolbar is hidden                   |
| [`useEditRecord`](./src/hooks/useEditRecord.ts)           | Edit/delete actions are blocked                     |

Record-level edit/delete additionally checks `isAuthorOrAdmin(user, rec)`, which wraps `canContribute` and also verifies the user is either an admin **or** the original uploader (`email` match).

### Authentication & Session Lifecycle

```
User visits site
       │
       ▼
onAuthStateChanged  ──── no Firebase session ──→  [Anonymous / Read-only access]
       │
   Firebase session found
       │
       ▼
  storeUser(user)          ← called once per page load
       │
  User doc exists?
  ┌────┴──────────────────────────┐
  │ YES                           │ NO → Create new doc (nick = dummy(email))
  │                               │      isAdmin/isAuthorized = false
  │  Check timestamp age          │      First user → all flags = true
  │  vs CONFIG.loginDays (60 d)   └──────────────────────┐
  │                                                       │
  ├─ Expired + NOT a fresh login ──→ signOut() + clearAuth() [Session expired]
  │
  ├─ Fresh login (just signed in) ─→ Update timestamp to NOW
  │
  └─ Valid session ─────────────────→ Load user into Zustand store
                                       Refresh FCM token if allowPush
```

**Key constants** (from [`src/config.ts`](./src/config.ts)):

- `CONFIG.loginDays = 60` — Maximum session lifetime in days.

### Real-Time Session Enforcement (`onSnapshot`)

After a session is established, [`AppInitializer`](./src/app/AppInitializer.tsx) attaches a **Firestore `onSnapshot` listener** to the user's document. This means any change to the document is immediately reflected in the running client:

- **Permission changes** (`isAdmin`, `isAuthorized`, `allowPush`) propagate instantly without a page reload.
- **Force logout by admin**: Setting `timestamp` to `Timestamp.fromMillis(0)` triggers the `isExpired` check in the snapshot callback → automatic `signOut()` + `clearAuth()` + warning toast.

### Admin Force-Logout

Admins can remotely invalidate any user's session from the **Admin › Users** tab:

1. Admin clicks the **Logout** button next to a user row (confirms in dialog).
2. `logoutUser()` in [`createUsersAdminSlice.ts`](./src/stores/user/createUsersAdminSlice.ts):
   - Sets the target user's `timestamp` to `Timestamp.fromMillis(0)` in Firestore.
   - Batch-deletes all FCM device tokens for that user from the `devices` collection.
3. The target user's real-time `onSnapshot` listener detects the zeroed timestamp, calls `signOut()`, and redirects them to the sign-in state.

### Push Notification Token Lifecycle

FCM tokens are refreshed automatically at two points:

| Trigger                                   | Condition                                        | Action                                           |
| :---------------------------------------- | :----------------------------------------------- | :----------------------------------------------- |
| **Fresh sign-in** (`storeUser`)           | `allowPush === true`                             | `refreshToken()` called after session is written |
| **App entry / doc update** (`onSnapshot`) | `allowPush === true` AND token not yet in memory | `refreshToken()` called lazily                   |

The `refreshToken()` method (in [`createNotificationsSlice`](./src/stores/user/createNotificationsSlice.ts)) requests a new FCM registration token and upserts it into the `devices` collection. Tokens are keyed by the FCM key itself to avoid duplicates across devices.

### Permission Summary Table

| Action                     | Anonymous | Signed-in (no flags) | `isAuthorized` | `isAdmin` |
| :------------------------- | :-------: | :------------------: | :------------: | :-------: |
| Browse gallery             |    ✅     |          ✅          |       ✅       |    ✅     |
| Search & filter            |    ✅     |          ✅          |       ✅       |    ✅     |
| View EXIF details          |    ✅     |          ✅          |       ✅       |    ✅     |
| Upload photos / videos     |    ❌     |          ❌          |       ✅       |    ✅     |
| Edit / delete own media    |    ❌     |          ❌          |       ✅       |    ✅     |
| Edit / delete any media    |    ❌     |          ❌          |       ❌       |    ✅     |
| Batch select & manage      |    ❌     |          ❌          |       ✅       |    ✅     |
| Access Admin portal        |    ❌     |          ❌          |       ❌       |    ✅     |
| Manage users & permissions |    ❌     |          ❌          |       ❌       |    ✅     |
| Force-logout another user  |    ❌     |          ❌          |       ❌       |    ✅     |
| Merge tags                 |    ❌     |          ❌          |       ❌       |    ✅     |
| Send push notifications    |    ❌     |          ❌          |       ❌       |    ✅     |

---

## 📖 Additional Documentation

For AI agent workflows and detailed developer guidelines, see:

- [`AGENTS.md`](./AGENTS.md) — Comprehensive developer architecture, state management patterns, and system guidelines.
- [`CLAUDE.md`](./CLAUDE.md) — Quick reference for AI developer commands and standards.

---

## 📄 License

Private repository. All rights reserved.
