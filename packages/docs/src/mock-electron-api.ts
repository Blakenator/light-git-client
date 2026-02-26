/**
 * Builds a serializable init-script string that installs a mock
 * `window.electronApi` before the React app boots.
 *
 * The mock intercepts every `invoke(channel, props)` call and returns
 * canned data from the scenario fixture, wrapped in the BackendResult
 * shape that invokeSync.ts expects: `{ content: JSON.stringify(data) }`.
 */
export function buildMockScript(scenarioData: Record<string, unknown>): string {
  const json = JSON.stringify(scenarioData);

  // This string is evaluated inside the browser via page.addInitScript().
  // It must be fully self-contained (no closures over Node variables).
  return `
    (function () {
      const __scenarioData = ${json};

      window.electronApi = {
        invoke: function (channel, props) {
          var result = __scenarioData[channel];
          if (result === undefined || result === null) {
            return Promise.resolve({ content: undefined });
          }
          return Promise.resolve({ content: JSON.stringify(result) });
        },
        on: function () {},
        removeListener: function () {},
      };

      // Provide a no-op setTheme so the app doesn't throw
      window.setTheme = function () {};
    })();
  `;
}
