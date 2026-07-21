# Andrejevici - Professional Photo Album PWA

Andrejevici is a modern photo album application built with **Next.js (React Framework)**, **TypeScript**, **Tailwind CSS**, and **Firebase**. It is deployed as a Progressive Web App (PWA) to provide a seamless experience across desktop and mobile devices.

## 🚀 Getting Started

### Prerequisites

Ensure you have the following tools installed on your system:

- **Node.js** (`^24 || ^22 || ^20 || ^18`)
- **Firebase Tools**: `npm install -g firebase-tools` (or run via `npx firebase`)

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Local Development

To run the application locally, you need both the Firebase emulators and the Next.js development server running.

1. **Start Backend Emulators**:

   ```bash
   ./ands run
   ```

   _This starts the Firebase emulators and imports/exports local data in `./data`._

2. **Start Frontend Dev Server**:
   ```bash
   npm run dev
   ```
   _Alternatively, run `npm run dev:pwa` to build the PWA service worker before starting the dev server._

---

## 🛠 Development Workflow

The project uses a helper script, [`./ands`](./ands), to simplify common development and deployment tasks.

| Command            | Action  | Description                                                                       |
| :----------------- | :------ | :-------------------------------------------------------------------------------- |
| `./ands run`       | Backend | Starts Firebase emulators with local data import/export.                          |
| `./ands build`     | Build   | Updates `NEXT_PUBLIC_BUILD` timestamp in `.env` and builds the Next.js PWA.       |
| `./ands deploy`    | Deploy  | Deploys the client-side application to Firebase (excluding functions/extensions). |
| `./ands functions` | Backend | Builds and deploys `functionNotify`, `functionCron`, and `functionThumb`.         |
| `./ands test`      | Quality | Runs TypeScript unit test suite.                                                  |

---

## ⚙️ Advanced & DevOps

### Firebase Image Resize Configuration

The project utilizes the `storage-resize-images` extension for automatic thumbnail generation. For consistency across environments, use the following configuration:

- **Bucket**: `andrejevici.appspot.com`
- **Image Sizes**: `400x400`
- **Output Path**: `thumbnails`
- **Cache Control**: `Cache-Control: public, max-age=604800`
- **Content Filter**: `OFF`

### Docker Integration

For a consistent development environment, you can use the `firebase-tools` Docker image:

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

## 📂 Project Structure

- `src/`: Frontend source code.
  - `app/`: Next.js App Router views, routes, and layouts.
  - `components/`: React components (UI controls, search, toolbars, dialogs, cards).
  - `stores/`: State management with Zustand (`app`, `user`, `values`, `bucket`).
  - `helpers/`: Utility modules (EXIF extraction, slug generation, Firestore collections, notifications).
  - `styles/`: Tailwind CSS global styles.
- `src-pwa/`: Custom service worker source and manifest configuration.
- `functionCron/`, `functionNotify/`, `functionThumb/`: Firebase Cloud Functions.
- `test/`: TypeScript tests run with `tsx`.
- `data/`: Local Firebase emulator data.
- `ands`: Bash utility script for development tasks.

For detailed guidelines and developer instructions, please refer to [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md).
