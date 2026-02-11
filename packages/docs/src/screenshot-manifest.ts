/**
 * Screenshot manifest — defines every screenshot to capture.
 *
 * Each entry maps a stable output filename to a scenario fixture and
 * optional viewport / pre-capture actions.
 *
 * To add a new screenshot:
 *   1. (Optional) create a new scenario JSON in ./scenarios/
 *   2. Add an entry here
 *   3. Add a matching ![alt](docs/screenshots/{name}.png) to the root README
 *   4. Run `pnpm docs:screenshots`
 */

export interface ScreenshotEntry {
  /** Stable output filename (without extension). Produces docs/screenshots/{name}.png */
  name: string;
  /** Scenario fixture file name (without .json), from src/scenarios/ */
  scenario: string;
  /** Alt text used in the README */
  readmeAlt: string;
  /** Override the default viewport for this screenshot */
  viewport?: { width: number; height: number };
  /**
   * Ordered list of actions to perform before taking the screenshot.
   * Supported formats:
   *   - "click:<selector>"   — click an element matching the CSS/text selector
   *   - "wait:<ms>"          — wait a fixed number of milliseconds
   */
  actions?: string[];
}

export const screenshots: ScreenshotEntry[] = [
  // --- Main views ---
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

  // --- Diff viewer ---
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

  // --- Active merge operation ---
  {
    name: 'merge-conflict',
    scenario: 'merge-conflict',
    readmeAlt: 'Active Merge Operation',
  },

  // --- Prune branches dialog ---
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

  // --- Merge branches dialog ---
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
];
