---
"light-git-client": patch
---

Fix diff viewer selection-to-content sync issues

- **Stale selections after file list refresh**: `getFileDiff()` now sanitizes `selectedUnstagedChanges`/`selectedStagedChanges` against the actual staged/unstaged file lists before requesting diffs. Previously, selections for files that moved between staged/unstaged (or disappeared) would persist in metadata and cause empty/blank diff results.

- **Concurrent request race condition**: Added a `_diffFetchVersion` counter so that in-flight `getFileDiff()` responses are discarded if a newer request was initiated, preventing stale results from overwriting fresh ones.

- **Selection sync gap in change-list**: `ChangeListComponent.updateSelection()` now emits `onSelectChanged` when the file list changes (e.g., after stage/unstage), keeping the parent's metadata in sync with the cleaned-up selection state.

- **Minor cleanup**: `selectionChanged()` now clears `commitDiff` alongside `diffCommitInfo`. Added null guard at the top of `getFileDiff()`.
