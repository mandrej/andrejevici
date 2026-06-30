# Andrejevici - Professional Photo Album PWA

Andrejevici is a modern photo album application built with **Vue 3 (Quasar Framework)** and **Firebase**. It is deployed as a Progressive Web App (PWA) to provide a seamless experience across desktop and mobile devices.

## 🚀 Getting Started

### Prerequisites

Ensure you have the following tools installed on your system:
- **Node.js** (Latest LTS recommended)
- **Firebase Tools**: `npm install -g firebase-tools`
- **Inkscape**: Required for generating PWA icons.
- **Quasar IconGenie**: `npm install -g @quasar/icongenie`

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Local Development

To run the application locally, you need both the Firebase emulators and the Quasar development server running.

1. **Start Backend Emulators**:
   ```bash
   ./ands run
   ```
   *This starts the Firebase emulators and imports local data from the `./data` directory.*

2. **Start Frontend Dev Server**:
   ```bash
   npm run dev
   ```
   *Alternatively: `quasar dev -m pwa`*

---

## 🛠 Development Workflow

The project uses a helper script, [`./ands`](./ands), to simplify common development and deployment tasks.

| Command | Action | Description |
| :--- | :--- | :--- |
| `./ands run` | Backend | Starts Firebase emulators with local data import/export. |
| `./ands build` | Build | Updates the build version in `.env` and builds the Quasar PWA. |
| `./ands deploy` | Deploy | Deploys the client-side application to Firebase (excluding functions/extensions). |
| `./ands functions` | Backend | Builds and deploys `functionNotify`, `functionCron`, and `functionThumb`. |
| `./ands icons` | Assets | Generates PWA icons from `AppIcon.svg` using Inkscape and IconGenie. |
| `./ands test` | Quality | Runs TypeScript utility tests (e.g., slug generation, EXIF parsing). |

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

- `src/`: Frontend source code (Vue 3 / Quasar).
- `functionCron/`, `functionNotify/`, `functionThumb/`: Firebase Cloud Functions.
- `test/`: TypeScript tests for utility functions.
- `data/`: Local Firebase emulator data.
- `ands`: Bash utility script for development tasks.

For detailed architectural guidance, coding standards, and a deeper dive into the project layout, please refer to [CLAUDE.md](CLAUDE.md).
