import { setTimeout as delay } from "node:timers/promises";

const NEXT_PAGE_LABEL = /next page|página siguiente|siguiente/i;

/**
 * Walks the paginator and collects the full HTML of every page for the
 * currently selected regional. A single `page.content()` call would only
 * ever see the first page of vacancies.
 * @param {import('playwright').Page} page
 * @param {Object} config - App config from `loadConfig`.
 * @returns {Promise<string[]>} Array of raw HTML strings, one per paginated page.
 */
export async function collectPages(page, config) {
  const { contentSelector, maxPages } = config;
  const scope =
    contentSelector && contentSelector !== "body" ? `${contentSelector} ` : "";
  const firstCell = `${scope}tbody tr td`;

  const pages = [await page.content()];
  const next = page.getByRole("button", { name: NEXT_PAGE_LABEL });

  for (let visited = 1; visited < maxPages; visited += 1) {
    if ((await next.count()) === 0 || (await next.first().isDisabled())) break;

    const before = (
      await page
        .locator(firstCell)
        .first()
        .textContent()
        .catch(() => "")
    )?.trim();

    await next.first().click();
    await page
      .waitForFunction(
        ({ selector, previous }) =>
          document.querySelector(selector)?.textContent?.trim() !== previous,
        { selector: firstCell, previous: before },
        { timeout: 10000 },
      )
      .catch(() => {});
    await delay(400);
    pages.push(await page.content());
  }

  return pages;
}
