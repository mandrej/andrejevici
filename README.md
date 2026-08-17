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
- 📤 **Multi-File Upload & Cloud Processing**: Media upload flow with automatic cloud-based thumbnail generation (`400x400` thumbnails via Firebase Cloud Storage extensions & Cloud Functions).
- 🔐 **Role-Based Auth & Admin Portal**: Firebase Authentication integration with administrative tools for photo curation, user rights management, and tag merging.
- 🔔 **Push Notifications**: Firebase Cloud Messaging (FCM) integration for real-time mobile and browser notifications.
- 🎨 **Dark & Light Mode**: Built-in dark and light UI themes powered by `next-themes` and Tailwind CSS 4.

---

## 🛠️ Tech Stack

| Domain               | Technology                                                                                                                             |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**        | [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)                                                        |
| **Language**         | [TypeScript 5.9](https://www.typescriptlang.org/)                                                                                      |
| **Styling**          | [Tailwind CSS 4](https://tailwindcss.com/) + [@headlessui/react](https://headlessui.com/) + [@heroicons/react](https://heroicons.com/) |
| **State Management** | [Zustand 5](https://github.com/pmndrs/zustand) (Modular Slices)                                                                        |
| **Backend & Cloud**  | [Firebase 11](https://firebase.google.com/) (Firestore, Storage, Auth, Cloud Functions, Messaging)                                     |
| **Media Processing** | [ExifReader](https://github.com/mattiasw/ExifReader) + `yet-another-react-lightbox`                                                    |
| **PWA & Offline**    | Workbox Build 7 + Custom Service Worker                                                                                                |
| **Build & Tooling**  | Webpack + `tsx` test runner + ESLint 9 + Prettier                                                                                      |

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
| `./ands deploy`    | **Deploy**  | `firebase deploy --only hosting`                                                              | Deploys compiled client application to Firebase Hosting (excludes Cloud Functions & extensions).                        |
| `./ands indexes`   | **Deploy**  | `firebase deploy --only firestore:indexes`                                                    | Deploys updated Firestore index configuration (`firestore.indexes.json`) to Cloud Firestore.                            |
| `./ands functions` | **Deploy**  | Builds `functionNotify`, `functionCron`, `functionThumb` + `firebase deploy --only functions` | Compiles TypeScript source for all Cloud Functions & deploys them to Firebase.                                          |
| `./ands icons`     | **Assets**  | `npm run icons` (`node scripts/build-icons.js`)                                               | Generates all PWA web app icons and favicons from `AppIcon.svg`.                                                        |
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
| `npm run icons`   | `node scripts/build-icons.js`                                    | Build icons using Inkscape & Icongenie toolchain.                                |

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
│   │   ├── dialog/                  # Lightbox carousel & edit dialogs
│   │   ├── sidebar/                 # Navigation & selection sidebars
│   │   ├── tab/                     # Metadata, users, & video management tabs
│   │   └── toolbar/                 # Contextual action toolbars
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

Automatic thumbnail generation relies on the `storage-resize-images` extension configured with:

- **Bucket**: `andrejevici.appspot.com`
- **Output Dimensions**: `400x400`
- **Suffix**: `_400x400.jpeg`
- **Cache-Control**: `public, max-age=604800`

### Docker Environment

You can also run Firebase emulators in isolated Docker environments using the pre-configured `andreysenov/firebase-tools` image:

```bash
docker run -dit \
  -p 9199:9199 -p 9099:9099 -p 9005:9005 -p 9000:9000 -p 8085:8085 -p 8080:8080 -p 5001:5001 -p 4000:4000 \
  -v $(pwd):/project \
  -v $(pwd)/data:/data \
  -w /project \
  --name firebase-tools \
  andreysenov/firebase-tools:latest-node-22 \
  firebase emulators:start --import /data
```

---

## 📖 Additional Documentation

For AI agent workflows and detailed developer guidelines, see:

- [`AGENTS.md`](./AGENTS.md) — Comprehensive developer architecture, state management patterns, and system guidelines.
- [`CLAUDE.md`](./CLAUDE.md) — Quick reference for AI developer commands and standards.

---

## 📄 License

Private repository. All rights reserved.
