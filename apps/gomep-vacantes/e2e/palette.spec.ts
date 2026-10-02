import { expect, test, type Page } from "@playwright/test";

type PaintedWindow = Window & {
  samePainted: (actual: string, expected: string) => boolean;
};

async function tokenMatches(page: Page, name: string, expected: string) {
  return page.evaluate(
    ({ name, expected }) => {
      const actual = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
      return (window as PaintedWindow).samePainted(actual, expected);
    },
    { name, expected },
  );
}

test("el home hereda el azul 255 en botón, panel, texto y anillo", async ({
  page,
}) => {
  await page.addInitScript(() => {
    function channels(value: string) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      if (!context) return "";
      context.fillStyle = "#010203";
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data).join(",");
    }

    (window as PaintedWindow).samePainted = (actual, expected) => {
      const resolved = expected.startsWith("var(")
        ? (() => {
            const probe = document.createElement("div");
            probe.style.color = expected;
            document.body.appendChild(probe);
            const painted = getComputedStyle(probe).color;
            probe.remove();
            return painted;
          })()
        : expected;
      const left = channels(actual);
      const right = channels(resolved);
      return left === right && left !== "1,2,3,255";
    };
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByText("Cargando…")).toHaveCount(0);

  await expect
    .poll(() => tokenMatches(page, "--primary", "oklch(0.42 0.14 255)"))
    .toBe(true);
  await expect
    .poll(() => tokenMatches(page, "--primary-foreground", "oklch(0.985 0 0)"))
    .toBe(true);
  await expect
    .poll(() => tokenMatches(page, "--ring", "oklch(0.55 0.12 255)"))
    .toBe(true);
  await expect
    .poll(() => tokenMatches(page, "--foreground", "oklch(0.145 0 0)"))
    .toBe(true);

  const button = page.getByRole("button", { name: "Crear cuenta" });
  await expect(button).toBeVisible();
  await expect
    .poll(() =>
      button.evaluate((el) =>
        (window as PaintedWindow).samePainted(
          getComputedStyle(el).backgroundColor,
          "var(--primary)",
        ),
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      button.evaluate((el) =>
        (window as PaintedWindow).samePainted(
          getComputedStyle(el).color,
          "var(--primary-foreground)",
        ),
      ),
    )
    .toBe(true);

  const brand = page.getByRole("heading", { name: "Vacantes del MEP" });
  await expect(brand).toBeVisible();
  await expect
    .poll(() =>
      brand.evaluate((el) => {
        const panel = el.closest(".bg-primary");
        return panel
          ? (window as PaintedWindow).samePainted(
              getComputedStyle(panel).backgroundColor,
              "var(--primary)",
            )
          : false;
      }),
    )
    .toBe(true);
  await expect
    .poll(() =>
      brand.evaluate((el) =>
        (window as PaintedWindow).samePainted(
          getComputedStyle(el).color,
          "var(--primary-foreground)",
        ),
      ),
    )
    .toBe(true);

  const name = page.getByRole("textbox", { name: "Nombre" });
  await expect
    .poll(() =>
      name.evaluate((el) =>
        (window as PaintedWindow).samePainted(
          getComputedStyle(el).color,
          "var(--foreground)",
        ),
      ),
    )
    .toBe(true);

  await name.click();
  await expect
    .poll(() =>
      name.evaluate((el) =>
        (window as PaintedWindow).samePainted(
          getComputedStyle(el).borderTopColor,
          "var(--ring)",
        ),
      ),
    )
    .toBe(true);

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  try {
    await expect
      .poll(() => tokenMatches(page, "--primary", "oklch(0.75 0.12 255)"))
      .toBe(true);
    await expect
      .poll(() =>
        tokenMatches(page, "--primary-foreground", "oklch(0.22 0.04 255)"),
      )
      .toBe(true);
    await expect
      .poll(() => tokenMatches(page, "--ring", "oklch(0.70 0.10 255)"))
      .toBe(true);
    await expect
      .poll(() => tokenMatches(page, "--sidebar-primary", "oklch(0.75 0.12 255)"))
      .toBe(true);
    await expect
      .poll(() =>
        tokenMatches(
          page,
          "--sidebar-primary-foreground",
          "oklch(0.22 0.04 255)",
        ),
      )
      .toBe(true);
    await expect
      .poll(() => tokenMatches(page, "--chart-1", "oklch(0.70 0.12 255)"))
      .toBe(true);
    await expect
      .poll(() => tokenMatches(page, "--chart-5", "oklch(0.50 0.10 255)"))
      .toBe(true);
  } finally {
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
  }
});
