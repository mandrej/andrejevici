# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Workflow
- **Dev server**: `npm run dev` (Quasar PWA mode)
- **Build client**: `npm run build` or `./ands build` (includes version update in `.env`)
- **Lint**: `npm run lint`
- **Format**: `npm run format`
- **Run Tests**: `npm run test` (runs all `tsx` tests) or `./ands test` for specific tests

### Firebase & Backend
- **Start Emulators**: `./ands run` (starts Firebase emulators with imported data)
- **Deploy Client**: `./ands deploy` (firebase deploy excluding functions/extensions)
- **Deploy Functions**: `./ands functions` (builds `functionNotify`, `functionCron`, `functionThumb` and deploys them)

### Asset Management
- **Build Icons**: `./ands icons` (requires Inkscape and `@quasar/icongenie`)

## Architecture & Structure

### Big Picture
The project is a photo album application built with a Quasar (Vue 3) frontend and a Firebase backend. It is deployed as a PWA.

### Project Layout
- `src/`: Frontend source code.
    - `pages/`: Application views and routing.
    - `stores/`: State management using Pinia.
    - `components/`: Reusable Vue components.
    - `helpers/`: Utility functions and business logic.
    - `firebase.ts`: Firebase SDK initialization.
- `functionCron/`, `functionNotify/`, `functionThumb/`: Separate directories for Firebase Cloud Functions, each with its own build process.
- `test/`: TypeScript tests for utility functions (e.g., slug generation, EXIF parsing).
- `firestore.rules` & `storage.rules`: Firebase security rules for the database and storage bucket.
- `ands`: A bash utility script for common development and deployment tasks.

## Coding Standards
- **Language**: TypeScript for both frontend and backend.
- **Framework**: Vue 3 with Quasar components.
- **State Management**: Pinia.
- **Styling**: SCSS / Quasar CSS framework.
- **Formatting**: Prettier and ESLint are used for consistency.
