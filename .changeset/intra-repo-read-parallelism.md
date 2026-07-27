---
"light-git-client": minor
---

Intra-repo read parallelism in job queue

- **Concurrent read operations**: Read-only git operations (listing branches, getting file changes, commit history, stashes, etc.) now run concurrently on the same repository instead of one-at-a-time. Write operations still serialize and wait for in-flight reads to finish before starting.

- **`parallelizable` flag**: Added to `JobConfig` in the React job store. Set to `true` on all 14 read-only git operations in `useGitService`. Defaults to `false` so existing behavior is fully preserved.

- **ActiveJobs UI**: The job indicator now correctly shows in-flight parallel jobs that have been removed from the queue but are still executing.

- **Test infrastructure**: Added `vitest` and 12 tests covering concurrent reads, write/read ordering, stacked sequences, failure cascade, and lifecycle events. Angular job system is untouched.
