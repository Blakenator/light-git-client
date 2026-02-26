import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { buildMockScript } from './mock-electron-api';
import { screenshots } from './screenshot-manifest';

// Resolve paths relative to the monorepo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCENARIOS_DIR = path.resolve(__dirname, 'scenarios');
const OUTPUT_DIR = path.resolve(REPO_ROOT, 'docs', 'screenshots');

// Ensure the output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const entry of screenshots) {
  test(`capture: ${entry.name}`, async ({ page, browser }) => {
    // 1. Load scenario fixture
    const scenarioPath = path.resolve(SCENARIOS_DIR, `${entry.scenario}.json`);
    const scenarioData = JSON.parse(fs.readFileSync(scenarioPath, 'utf-8'));

    // 2. Apply custom viewport if specified
    if (entry.viewport) {
      const context = await browser.newContext({ viewport: entry.viewport });
      const customPage = await context.newPage();
      await runCapture(customPage, scenarioData, entry);
      await context.close();
    } else {
      await runCapture(page, scenarioData, entry);
    }
  });
}

async function runCapture(
  page: import('@playwright/test').Page,
  scenarioData: Record<string, unknown>,
  entry: (typeof screenshots)[number],
) {
  // Inject the mock electronApi before the app loads
  const mockScript = buildMockScript(scenarioData);
  await page.addInitScript({ content: mockScript });

  // Navigate to the app
  await page.goto('/');

  // Wait for the app to be meaningfully rendered.
  // The Navbar renders a "Settings" button once the HomePage mounts;
  // for empty-tab scenarios the NewTabPage also renders immediately.
  // Using role-based selectors avoids reliance on styled-components class names.
  await page.waitForSelector('button:has-text("Settings"), button:has-text("Open Repository")', {
    timeout: 15_000,
  });

  // Give the UI a moment to finish rendering all cards / data
  await page.waitForTimeout(1500);

  // Execute any pre-capture actions
  if (entry.actions) {
    for (const action of entry.actions) {
      if (action.startsWith('click:')) {
        const selector = action.slice('click:'.length);
        await page.click(selector);
        await page.waitForTimeout(500);
      } else if (action.startsWith('click-near:')) {
        // click-near:<anchor-text>|<target-selector>
        // Finds the element containing anchor text, then clicks the target
        // selector scoped within its closest section/parent container.
        const [anchorText, targetSelector] = action.slice('click-near:'.length).split('|');
        const anchor = page.getByText(anchorText, { exact: false }).first();
        // Walk up to the nearest card/section container, then find the button
        const container = anchor.locator('xpath=ancestor::*[position()<=5]').last();
        await container.locator(targetSelector).first().click();
        await page.waitForTimeout(500);
      } else if (action.startsWith('click-testid:')) {
        const testId = action.slice('click-testid:'.length);
        await page.getByTestId(testId).click();
        await page.waitForTimeout(500);
      } else if (action.startsWith('click-role:')) {
        // click-role:<role>|<name>  e.g. click-role:button|Prune
        const [role, name] = action.slice('click-role:'.length).split('|');
        await page.getByRole(role as any, { name }).click();
        await page.waitForTimeout(500);
      } else if (action.startsWith('click-nth:')) {
        // click-nth:<selector>|<index>  e.g. click-nth:button.btn-warning|0
        const [selector, indexStr] = action.slice('click-nth:'.length).split('|');
        const idx = parseInt(indexStr, 10);
        await page.locator(selector).nth(idx).click();
        await page.waitForTimeout(500);
      } else if (action.startsWith('wait:')) {
        const ms = parseInt(action.slice('wait:'.length), 10);
        await page.waitForTimeout(ms);
      }
    }
  }

  // Capture the screenshot
  const outputPath = path.resolve(OUTPUT_DIR, `${entry.name}.png`);
  await page.screenshot({ path: outputPath, fullPage: false });
}
