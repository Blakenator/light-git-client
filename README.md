# Light Git Client

A lightweight, feature-rich Git GUI built with Electron.

[![Build Status](https://github.com/Blakenator/light-git-client/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/Blakenator/light-git-client/actions?query=branch%3Amaster)

**[Documentation](https://blakenator.github.io/light-git-client/)** | **[Download](https://github.com/Blakenator/light-git-client/releases)** | **[Features](https://blakenator.github.io/light-git-client/features/branching)**

## Screenshots

![Dark Main Screen](docs/screenshots/dark1.png)
![Light Main Screen](docs/screenshots/light1.png)
![New Tab Screen](docs/screenshots/empty-tab.png)
![Diff Viewer](docs/screenshots/diff-viewer.png)
![Active Merge Operation](docs/screenshots/merge-conflict.png)
![Prune Branches Dialog](docs/screenshots/prune-branches.png)
![Merge Branches Dialog](docs/screenshots/merge-branches.png)

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 9+
- [Git](https://git-scm.com/)

### Project Structure

This is a pnpm monorepo with the following packages:

| Package | Description |
| ------- | ----------- |
| `packages/backend` | Electron main process — Git operations, IPC handlers, file system access |
| `packages/frontend` | React + Vite UI rendered in the Electron browser window |
| `packages/shared` | Shared TypeScript types and models used by both backend and frontend |
| `packages/core` | Shared UI components and utilities |
| `packages/docs` | Documentation site (VitePress) and screenshot capture tooling (Playwright) |

### Getting Started

```bash
# Clone the repository
git clone https://github.com/Blakenator/light-git-client.git
cd light-git-client

# Install dependencies (also runs the initial build via postinstall)
pnpm install
```

### Running in Development

```bash
# Start the Vite dev server + Electron together
pnpm start
```

This builds all packages, starts the Vite dev server on `http://localhost:4200`, waits for it to be ready, then launches Electron pointing at the dev server.

For faster iteration on the **backend** (main process) only:

```bash
# Watch backend source and auto-restart Electron on changes
pnpm electron:serve
```

For frontend-only development (no Electron window):

```bash
# Start all dev servers in parallel (frontend + backend watch)
pnpm dev
```

### Building

```bash
# Build all packages (shared → backend → frontend)
pnpm build

# Run the built app locally without packaging
pnpm electron:local
```

### Packaging & Distribution

Build platform-specific distributables using `electron-builder`:

```bash
# macOS (.dmg, .zip)
pnpm electron:mac

# Windows (NSIS installer, portable .exe, .7z, .zip)
pnpm electron:windows

# Linux (AppImage, .deb)
pnpm electron:linux
```

Output goes to `app-builds/`.

### Releasing

Tagged releases are published to [GitHub Releases](https://github.com/Blakenator/light-git-client/releases) via CI. To publish manually:

```bash
pnpm release:mac
pnpm release:windows
pnpm release:linux
```

These build and upload artifacts with `-p always`, requiring a `GITHUB_TOKEN` with release permissions.

### Testing

```bash
# Run backend tests
pnpm test-node

# Run backend tests in watch mode
pnpm test-node-watch
```

### Documentation Site

The documentation is built with [VitePress](https://vitepress.dev/) and deployed to [GitHub Pages](https://blakenator.github.io/light-git-client/).

```bash
# Start the docs dev server
pnpm docs:dev

# Build the docs site
pnpm docs:build

# Capture/update documentation screenshots
pnpm docs:screenshots
```

See the full documentation at **[blakenator.github.io/light-git-client](https://blakenator.github.io/light-git-client/)** for installation guides, feature walkthroughs, and configuration details.

### Clean

```bash
# Remove all build artifacts and node_modules
pnpm clean
```
