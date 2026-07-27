# Copilot Instructions

## Architecture: Dual-Framework Agent Rules

This project maintains two agent instruction systems that share a single source of truth:

| System | File | Consumer |
|--------|------|----------|
| **Source of truth** | `.cursor/rules/*.mdc` (8 files) | Cursor + Claude |
| **Copilot entry point** | This file | Copilot Chat + DeepSeek |

**Keep them in sync.** When you add, remove, or change an `alwaysApply` status on a Cursor rule,
update this file accordingly.

Cursor rules use YAML frontmatter (`alwaysApply`, `globs`) that Copilot does NOT parse.
Instead, this file embeds the always-apply rules inline and provides a routing table for
domain-specific rules. When working in a domain, read the relevant `.mdc` files — the routing
table below tells you which ones.

---

## Project Overview

**Light Git Client** — a lightweight, self-hosted Git GUI built on Electron.

| Package | Framework | Purpose |
|---------|-----------|---------|
| `packages/backend/` | Node.js / Electron main | Git operations, IPC handlers, file system |
| `packages/frontend/` | React 18 / Vite | Renderer UI, Zustand stores, react-bootstrap |
| `packages/core/` | TypeScript | Core git abstractions |
| `packages/shared/` | TypeScript | IPC types, shared utilities |
| `packages/docs/` | Playwright | Documentation & screenshot automation |

**Package manager**: pnpm 10.29.2 (enforced — see always-apply rules).

---

## Always-Apply Rules

These rules apply to **every task, regardless of domain**. Follow them without needing to read
the source `.mdc` files — but read the full file if you need deeper detail.

### 1. Package Management (`package-management.mdc`)
- **Use `pnpm` exclusively** — never `npm`, `yarn`, or `npx`.
- Internal package dependencies MUST use `workspace:*` protocol.
- Run commands from root with `pnpm run --filter <package> <script>`.

### 2. Project Structure (`project-structure.mdc`)
- Shared IPC types live in `packages/shared/src/` — all channel names and payloads defined here.
- IPC handlers in `packages/backend/src/ipc/`, frontend hooks use `@superflag/super-ipc-react`.
- Git operations in `packages/backend/src/git/` and `packages/core/src/`.
- State management: Zustand with `useRepositoryStore` (per-repo) and `repoViewStore` (shared view state), both keyed by `repoPath`.
- Use `electron-log` for backend logging — never `console.log` in the main process.
- Key paths: React components in `packages/frontend/src/components/`, Zustand stores in `packages/frontend/src/stores/`, hooks in `packages/frontend/src/hooks/`.

### 3. Clarifying Questions (`clarifying-questions.mdc`)
- **Ask at least 3 clarifying questions** before implementing any feature or finalizing a plan.
- Skip only for mechanically unambiguous tasks (typo fixes, renames) or follow-ups where questions were already answered.
- Prioritize repo-specific concerns: IPC boundary (new channel needed?), store design (repoViewStore vs local state?), component ownership, shared types, testing scope, platform (cross-platform?).
- **Plans must include**: (1) `## Purpose` section first explaining the business need, (2) `## Final Audit` section last with an explicit TODO item to verify the completed work.
- **Copilot note**: Use `vscode_askQuestions` tool in Copilot Chat. In Copilot CLI, ask inline text questions.

### 4. Testing Standards (`testing-standards.mdc`) — NON-NEGOTIABLE

**Tests are mandatory for every code change.** You may NEVER skip writing or updating tests, even for "small" or "obvious" changes. The only exception is pure Q&A / read-only investigation with zero code edits.

- **Three-pass process** — all three passes MUST be visible as distinct, sequential edits:
  - Pass 1: Write `describe`/`it` hierarchy with `Why`/`Given`/`When`/`Then` pseudocode comments. Every `it` block MUST have all four labels. Pseudocode MUST describe user-observable behavior, not implementation details (no framework method names, stub references, or magic numbers).
  - Pass 2: Fill in real implementation, keeping ALL pseudocode comments intact. Never delete them — they are permanent documentation.
  - Pass 3: Audit — re-read every `it` block. Verify: Given setup matches the preconditions, When exercises the trigger described, Then asserts every stated outcome. Fix mismatches in-place. Produce no new comments or files from this pass.

- **Test real code, not mocks.** NEVER create a local mock object and test it directly — that only tests the mock. Always test the actual function/component/endpoint.

- **Anti-patterns to NEVER commit**: mock-only testing, render-only tests without user event + assertion, duplicating shared mocks.

- **What MUST have tests**: all new IPC handlers in `packages/backend/src/`, all new functions in `packages/backend/src/git/` and `packages/core/src/`, all new React components with interactive behavior, all new Zustand store actions/selectors, all security-sensitive code (auth, input validation, file path handling).

- **Before marking any task done**, verify: did you write/update tests? Did you run them? Did they pass? If any answer is no, the task is NOT done.

### 5. Security Hardening (`security-hardening.mdc`)
- **Never hardcode secrets** — use env vars with fail-fast.
- **Electron defaults**: `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true` on all BrowserWindows. Never disable these.
- **IPC safety**: All channel names in `packages/shared/src/`. Validate all IPC inputs. Never expose raw `error.stack` or internal file paths over IPC. Use `getIpcErrorMessage()` for frontend error extraction.
- **Shell safety**: Validate URLs before `shell.openExternal`. Use `execFile` with argument arrays, never `exec` with string interpolation.
- **Error handling**: Log detailed errors on backend with `electron-log`. Surface only user-actionable messages to the frontend.

### 6. Completion Gate (`completion-gate.mdc`)
- **Before any final "done" message**, run the completion gate:
  - Walk the todo list and verify each completed item against the actual diff.
  - Run the Applicable Rules Audit — scan `.cursor/rules/` for `alwaysApply`, `globs`, and work-type matches.
  - Fix gaps and re-verify (max 2 passes). If still not READY, stop and report remaining gaps.
  - Append a Plan Verification Report with Completed Items, Applicable Rules Audit (Pass/Fail/N/A per rule), and Recommendation (`READY` / `NEEDS ATTENTION` / `BLOCKED`).
- Skip only for: net diff under 10 lines AND single-intent requests (typo fix, rename, one-liner), or pure Q&A / read-only investigation.
- Never delegate fixes to a subagent — you fix gaps yourself.

---

## Domain Routing Table

When working in a domain, read the corresponding `.cursor/rules/*.mdc` files for detailed guidance.
The always-apply rules above already cover universal conventions — these files add domain-specific depth.

### Frontend (`packages/frontend/`)

| Rule file | When to read |
|-----------|-------------|
| `component-decomposition.mdc` | Editing `packages/frontend/src/components/RepoView/**/*.{ts,tsx}` — card self-management, Zustand selector patterns, domain hooks, store design |
| `ipc-error-handling.mdc` | Editing `packages/frontend/**/*.{ts,tsx}` — use `getIpcErrorMessage()` for super-ipc wrapped errors |

### Backend (`packages/backend/`)

| Rule file | When to read |
|-----------|-------------|
| `ipc-error-handling.mdc` | Working with IPC handlers — error message extraction pattern applies on both sides |
| `security-hardening.mdc` | Any backend change — read the full `.mdc` for Electron security details beyond the always-apply summary |
