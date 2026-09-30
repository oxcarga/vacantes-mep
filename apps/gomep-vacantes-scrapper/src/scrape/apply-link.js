/**
 * Turns the relative URI Blazor navigates to into an absolute apply URL.
 * The MEP app sets `<base href="…/formulario/">`, so `./solicitud` stays under
 * that path. Resolving against `location.href` (no trailing slash) would drop
 * `/formulario`.
 * @param {string} uri
 * @param {string} baseHref
 * @returns {string}
 */
export function resolveApplyUrl(uri, baseHref) {
  const raw = String(uri ?? "").trim();
  if (!raw) return "";
  try {
    return new URL(raw, baseHref).href;
  } catch {
    return "";
  }
}

/**
 * Clicks every "Aplicar" button on the current table page and writes the
 * destination URL onto the row as `data-aplicar`. The button has no `href`;
 * Blazor only builds `/formulario/solicitud?data=…` when it is clicked.
 * Navigation is swallowed so the table stays put for the rest of the scrape.
 * @param {import('playwright').Page} page
 * @returns {Promise<void>}
 */
export async function stampApplyLinks(page) {
  const missing = await page.evaluate(async (resolverSource) => {
    const resolveApplyUrl = new Function(`return (${resolverSource});`)();
    const nav = window.Blazor?._internal?.navigationManager;
    const buttons = () => [
      ...document.querySelectorAll(
        'tbody tr button[aria-label="Aplicar a la vacante"]',
      ),
    ];
    const total = buttons().length;
    if (!nav || total === 0) return 0;

    const baseHref = document.querySelector("base")?.href || location.href;
    const original = nav.navigateTo.bind(nav);
    let missing = 0;
    nav.navigateTo = (uri) => {
      nav.__aplicarUrl = String(uri ?? "");
    };
    try {
      for (let index = 0; index < total; index += 1) {
        nav.__aplicarUrl = "";
        const button = buttons()[index];
        if (!button) {
          missing += 1;
          continue;
        }
        button.click();
        const deadline = Date.now() + 8000;
        while (!nav.__aplicarUrl && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 30));
        }
        const href = resolveApplyUrl(nav.__aplicarUrl, baseHref);
        const live = buttons()[index];
        if (href && live) live.closest("tr").setAttribute("data-aplicar", href);
        else missing += 1;
      }
    } finally {
      nav.navigateTo = original;
    }
    return missing;
  }, resolveApplyUrl.toString());

  if (missing > 0) {
    console.warn(
      `No se pudo leer el enlace de Aplicar de ${missing} vacante(s).`,
    );
  }
}
