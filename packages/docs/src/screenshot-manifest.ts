/**
 * Screenshot manifest — defines every screenshot to capture.
 *
 * Each entry maps a stable output filename to a scenario fixture and
 * optional viewport / pre-capture actions.
 *
 * To add a new screenshot:
 *   1. (Optional) create a new scenario JSON in ./scenarios/
 *   2. Add an entry here
 *   3. Add a matching ![alt](docs/screenshots/{name}.png) reference in the docs
 *   4. Run `pnpm docs:screenshots`
 */

export interface ScreenshotEntry {
  /** Stable output filename (without extension). Produces docs/screenshots/{name}.png */
  name: string;
  /** Scenario fixture file name (without .json), from src/scenarios/ */
  scenario: string;
  /** Alt text used in documentation */
  readmeAlt: string;
  /** Override the default viewport for this screenshot */
  viewport?: { width: number; height: number };
  /**
   * Ordered list of actions to perform before taking the screenshot.
   * Supported formats:
   *   - "click:<selector>"       — click an element matching the CSS/text selector
   *   - "click-near:<anchor>|<target>"  — find anchor text, click target nearby
   *   - "click-testid:<testId>"  — click by data-testid
   *   - "click-role:<role>|<name>" — click by ARIA role and name
   *   - "click-nth:<selector>|<index>" — click nth match of selector
   *   - "wait:<ms>"              — wait a fixed number of milliseconds
   */
  actions?: string[];
}

export const screenshots: ScreenshotEntry[] = [
  // ─── Main views ───────────────────────────────────────────────
  {
    name: 'dark1',
    scenario: 'dark-mode',
    readmeAlt: 'Dark Main Screen',
  },
  {
    name: 'light1',
    scenario: 'default-repo',
    readmeAlt: 'Light Main Screen',
  },
  {
    name: 'empty-tab',
    scenario: 'empty-tab',
    readmeAlt: 'New Tab Screen',
  },

  // ─── Diff viewer ──────────────────────────────────────────────
  {
    name: 'diff-viewer',
    scenario: 'with-diff',
    readmeAlt: 'Diff Viewer',
    actions: [
      // Click the "Diff" tab in the commit history card
      'click:button:has-text("Diff")',
      'wait:1000',
    ],
  },

  // ─── Active merge operation ───────────────────────────────────
  {
    name: 'merge-conflict',
    scenario: 'merge-conflict',
    readmeAlt: 'Active Merge Operation',
  },

  // ─── Prune branches dialog ───────────────────────────────────
  {
    name: 'prune-branches',
    scenario: 'default-repo',
    readmeAlt: 'Prune Branches Dialog',
    actions: [
      // Click the prune button — it's the only button containing the scissors/cut FA icon
      'click:button:has(svg[data-icon="cut"], svg[data-icon="scissors"])',
      'wait:800',
    ],
  },

  // ─── Merge branches dialog ───────────────────────────────────
  {
    name: 'merge-branches',
    scenario: 'default-repo',
    readmeAlt: 'Merge Branches Dialog',
    actions: [
      // Click the green merge button (material-icons "merge_type") in Locals header
      'click:button.btn-success:has-text("merge_type")',
      'wait:800',
    ],
  },

  // ─── Settings (General tab) ──────────────────────────────────
  {
    name: 'settings',
    scenario: 'rich-repo',
    readmeAlt: 'Settings Dialog',
    actions: [
      'click:button:has-text("Settings")',
      'wait:800',
    ],
  },

  // ─── Settings (Code Watchers tab) ────────────────────────────
  {
    name: 'code-watcher-settings',
    scenario: 'rich-repo',
    readmeAlt: 'Code Watcher Settings',
    actions: [
      'click:button:has-text("Settings")',
      'wait:600',
      'click:[role="tab"]:has-text("Code Watchers")',
      'wait:600',
    ],
  },

  // ─── Tabs (multiple tabs visible) ────────────────────────────
  {
    name: 'tabs',
    scenario: 'rich-repo',
    readmeAlt: 'Multiple Tabs',
  },

  // ─── Commit history (rich graph) ─────────────────────────────
  {
    name: 'commit-history',
    scenario: 'default-repo',
    readmeAlt: 'Commit History Graph',
  },

  // ─── Staging area ────────────────────────────────────────────
  {
    name: 'staging',
    scenario: 'rich-repo',
    readmeAlt: 'Staging Area',
  },

  // ─── Worktrees (multiple) ────────────────────────────────────
  {
    name: 'worktrees',
    scenario: 'rich-repo',
    readmeAlt: 'Worktrees',
  },

  // ─── Submodules ──────────────────────────────────────────────
  {
    name: 'submodules',
    scenario: 'rich-repo',
    readmeAlt: 'Submodules',
  },

  // ─── Command history (rich) ──────────────────────────────────
  {
    name: 'command-history',
    scenario: 'rich-repo',
    readmeAlt: 'Command History',
  },

  // ─── Edit sections mode ──────────────────────────────────────
  {
    name: 'edit-sections',
    scenario: 'default-repo',
    readmeAlt: 'Edit Sections Mode',
    actions: [
      // Open the repo menu dropdown (ellipsis button)
      'click:#repo-menu-dropdown',
      'wait:400',
      // Click "Edit Sections" in the dropdown
      'click:.dropdown-item:has-text("Edit Sections")',
      'wait:800',
    ],
  },
];
