# Merge & Rebase

Light Git Client provides a dedicated dialog for merge and rebase operations, along with an active operation banner for managing in-progress operations and conflict resolution.

![Active Merge Operation](../screenshots/merge-conflict.png)

## Merge Branch Dialog

![Merge Branches Dialog](../screenshots/merge-branches.png)

The merge dialog lets you combine branches with several strategies:

| Operation | Description |
| --------- | ----------- |
| **Merge** | Merge the source branch into the target branch. Creates a merge commit if it's not a fast-forward. |
| **Rebase** | Rebase the source branch onto the target branch, replaying commits on top. |
| **Interactive Rebase** | Start an interactive rebase session, allowing you to reorder, squash, edit, or drop commits. |

### Using the Dialog

1. Select a **source** branch (the branch whose changes you want to integrate)
2. Select a **target** branch (the branch to receive the changes — usually the current branch)
3. Use the filter to quickly find branches
4. The current branch is highlighted for easy identification
5. Choose your operation: Merge, Rebase, or Interactive Rebase

::: warning
A warning is shown when you have uncommitted changes. Stash or commit your changes before merging or rebasing to avoid conflicts with your working directory.
:::

## Active Operation Banner

When a merge, rebase, cherry-pick, or revert is in progress, an **Active Operation Banner** appears at the top of the screen.

The banner provides:

| Action | Description |
| ------ | ----------- |
| **Continue** | Continue the operation after resolving conflicts (e.g. after staging resolved files). |
| **Abort** | Abort the operation entirely and return to the state before it started. |

## Conflict Resolution

When a merge or rebase encounters conflicts:

1. Conflicting files appear in the **Unstaged Changes** card with a **U** (unmerged) status
2. Open the [Diff Viewer](/features/diff-viewer) to review conflict markers
3. Edit the files to resolve conflicts
4. Stage the resolved files
5. Click **Continue** in the active operation banner to proceed

## Tips

- Use **Rebase** to keep a linear history — it avoids merge commits and makes the log cleaner
- **Interactive Rebase** is powerful for cleaning up a feature branch before merging: squash fixup commits, reword messages, or reorder commits
- If a merge goes wrong, **Abort** brings you back to a clean state — no damage done
- You can also trigger merge and rebase from the branch context menus in the [Branching](/features/branching) cards
