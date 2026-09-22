import { fetchPagesWithBrowser } from "./browser.js";
import { withRetries } from "./retry.js";

const USER_AGENT =
  "Mozilla/5.0 (compatible; VacantesMEP/1.0; +https://github.com/oxcarga/vacantes-mep)";

export {
  fetchPagesWithBrowser,
  listNativeOptions,
  scrapeRegional,
  waitForNativeOptions,
} from "./browser.js";
export { findDropdownOption, formatMissingDropdownOption } from "./dropdown.js";
export { ConfigurationError } from "./errors.js";
export { collectPages } from "./pagination.js";
export { withRetries } from "./retry.js";

/**
 * Fetches a URL with a plain HTTP request and returns the response body as text.
 * @param {string} url - The URL to fetch.
 * @returns {Promise<string>} The raw HTML response body.
 */
export async function fetchPage(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.text();
}

function toFetchResult(groups) {
  return {
    groups,
    pages: groups.flatMap((group) => group.pages),
    regionalLabel:
      groups.length === 1 ? groups[0].regionalLabel : "todas las regionales",
  };
}

/**
 * Returns every HTML page that may contain vacancy rows, grouped by regional.
 * @param {Object} config - App config from `loadConfig`.
 * @returns {Promise<{ groups: { pages: string[], regionalLabel: string, regionalValue: string }[], pages: string[], regionalLabel: string }>}
 */
export async function fetchVacancyPages(config) {
  return withRetries(
    { attempts: config.scrapeAttempts, delayMs: config.scrapeRetryDelayMs },
    async () => {
      if (config.usePlaywright) {
        const { groups } = await fetchPagesWithBrowser(
          config.targetUrl,
          config,
        );
        return toFetchResult(groups);
      }

      const html = await fetchPage(config.targetUrl);
      return toFetchResult([
        { pages: [html], regionalLabel: "", regionalValue: "" },
      ]);
    },
  );
}
