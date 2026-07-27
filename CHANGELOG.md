# light-git-client

## 0.15.0

### Minor Changes

- 6d76ead: Intra-repo read parallelism in job queue

  - **Concurrent read operations**: Read-only git operations (listing branches, getting file changes, commit history, stashes, etc.) now run concurrently on the same repository instead of one-at-a-time. Write operations still serialize and wait for in-flight reads to finish before starting.

  - **`parallelizable` flag**: Added to `JobConfig` in the React job store. Set to `true` on all 14 read-only git operations in `useGitService`. Defaults to `false` so existing behavior is fully preserved.

  - **ActiveJobs UI**: The job indicator now correctly shows in-flight parallel jobs that have been removed from the queue but are still executing.

  - **Test infrastructure**: Added `vitest` and 12 tests covering concurrent reads, write/read ordering, stacked sequences, failure cascade, and lifecycle events. Angular job system is untouched.

### Patch Changes

- e543ed7: Fix diff viewer selection-to-content sync issues

  - **Stale selections after file list refresh**: `getFileDiff()` now sanitizes `selectedUnstagedChanges`/`selectedStagedChanges` against the actual staged/unstaged file lists before requesting diffs. Previously, selections for files that moved between staged/unstaged (or disappeared) would persist in metadata and cause empty/blank diff results.

  - **Concurrent request race condition**: Added a `_diffFetchVersion` counter so that in-flight `getFileDiff()` responses are discarded if a newer request was initiated, preventing stale results from overwriting fresh ones.

  - **Selection sync gap in change-list**: `ChangeListComponent.updateSelection()` now emits `onSelectChanged` when the file list changes (e.g., after stage/unstage), keeping the parent's metadata in sync with the cleaned-up selection state.

  - **Minor cleanup**: `selectionChanged()` now clears `commitDiff` alongside `diffCommitInfo`. Added null guard at the top of `getFileDiff()`.
