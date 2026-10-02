import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../app/globals.css"),
  "utf8",
);

function extractBlock(source: string, header: string) {
  const start = source.indexOf(header);
  assert.notEqual(start, -1, `falta el bloque ${header}`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  assert.fail(`bloque sin cerrar: ${header}`);
}

function tokens(block: string) {
  const values = new Map<string, string>();
  for (const match of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    values.set(match[1], match[2].trim());
  }
  return values;
}

const theme = tokens(extractBlock(css, "@theme inline"));
const light = tokens(extractBlock(css, ":root"));
const dark = tokens(extractBlock(css, ".dark {"));

describe("paleta en claro", () => {
  it("deja el acento en el matiz 255 y conserva los neutros", () => {
    assert.equal(light.get("primary"), "oklch(0.42 0.14 255)");
    assert.equal(light.get("primary-foreground"), "oklch(0.985 0 0)");
    assert.equal(light.get("ring"), "oklch(0.55 0.12 255)");
    assert.equal(light.get("sidebar-primary"), "oklch(0.42 0.14 255)");
    assert.equal(light.get("sidebar-primary-foreground"), "oklch(0.985 0 0)");
    assert.equal(light.get("chart-1"), "oklch(0.55 0.14 255)");
    assert.equal(light.get("chart-2"), "oklch(0.68 0.10 255)");
    assert.equal(light.get("chart-3"), "oklch(0.42 0.14 255)");
    assert.equal(light.get("chart-4"), "oklch(0.78 0.06 255)");
    assert.equal(light.get("chart-5"), "oklch(0.32 0.08 255)");

    assert.equal(light.get("background"), "oklch(1 0 0)");
    assert.equal(light.get("foreground"), "oklch(0.145 0 0)");
    assert.equal(light.get("card"), "oklch(1 0 0)");
    assert.equal(light.get("card-foreground"), "oklch(0.145 0 0)");
    assert.equal(light.get("popover"), "oklch(1 0 0)");
    assert.equal(light.get("popover-foreground"), "oklch(0.145 0 0)");
    assert.equal(light.get("secondary"), "oklch(0.97 0 0)");
    assert.equal(light.get("secondary-foreground"), "oklch(0.205 0 0)");
    assert.equal(light.get("muted"), "oklch(0.97 0 0)");
    assert.equal(light.get("muted-foreground"), "oklch(0.556 0 0)");
    assert.equal(light.get("accent"), "oklch(0.97 0 0)");
    assert.equal(light.get("accent-foreground"), "oklch(0.205 0 0)");
    assert.equal(light.get("destructive"), "oklch(0.577 0.245 27.325)");
    assert.equal(light.get("border"), "oklch(0.922 0 0)");
    assert.equal(light.get("input"), "oklch(0.922 0 0)");
    assert.equal(light.get("sidebar"), "oklch(0.985 0 0)");
    assert.equal(light.get("sidebar-foreground"), "oklch(0.145 0 0)");
    assert.equal(light.get("sidebar-accent"), "oklch(0.97 0 0)");
    assert.equal(light.get("sidebar-accent-foreground"), "oklch(0.205 0 0)");
    assert.equal(light.get("sidebar-border"), "oklch(0.922 0 0)");
    assert.equal(light.get("sidebar-ring"), "oklch(0.708 0 0)");
    assert.equal(light.get("radius"), "0.625rem");

    assert.equal(theme.get("color-primary"), "var(--primary)");
    assert.equal(theme.get("color-ring"), "var(--ring)");
    assert.equal(theme.get("color-sidebar-primary"), "var(--sidebar-primary)");
    assert.equal(theme.get("color-chart-1"), "var(--chart-1)");
    assert.deepEqual(
      [...theme.keys()].filter((name) => name.startsWith("color-")).sort(),
      [
        "color-accent",
        "color-accent-foreground",
        "color-background",
        "color-border",
        "color-card",
        "color-card-foreground",
        "color-chart-1",
        "color-chart-2",
        "color-chart-3",
        "color-chart-4",
        "color-chart-5",
        "color-destructive",
        "color-foreground",
        "color-input",
        "color-muted",
        "color-muted-foreground",
        "color-popover",
        "color-popover-foreground",
        "color-primary",
        "color-primary-foreground",
        "color-ring",
        "color-secondary",
        "color-secondary-foreground",
        "color-sidebar",
        "color-sidebar-accent",
        "color-sidebar-accent-foreground",
        "color-sidebar-border",
        "color-sidebar-foreground",
        "color-sidebar-primary",
        "color-sidebar-primary-foreground",
        "color-sidebar-ring",
      ],
    );
  });
});

describe("paleta en oscuro", () => {
  it("usa el mismo matiz 255, más claro, y no conserva el azul 264", () => {
    assert.equal(dark.get("primary"), "oklch(0.75 0.12 255)");
    assert.equal(dark.get("primary-foreground"), "oklch(0.22 0.04 255)");
    assert.equal(dark.get("ring"), "oklch(0.70 0.10 255)");
    assert.equal(dark.get("sidebar-primary"), "oklch(0.75 0.12 255)");
    assert.equal(
      dark.get("sidebar-primary-foreground"),
      "oklch(0.22 0.04 255)",
    );
    assert.equal(dark.get("chart-1"), "oklch(0.70 0.12 255)");
    assert.equal(dark.get("chart-2"), "oklch(0.78 0.08 255)");
    assert.equal(dark.get("chart-3"), "oklch(0.62 0.14 255)");
    assert.equal(dark.get("chart-4"), "oklch(0.85 0.05 255)");
    assert.equal(dark.get("chart-5"), "oklch(0.50 0.10 255)");

    assert.equal(dark.get("background"), "oklch(0.145 0 0)");
    assert.equal(dark.get("foreground"), "oklch(0.985 0 0)");
    assert.equal(dark.get("card"), "oklch(0.205 0 0)");
    assert.equal(dark.get("destructive"), "oklch(0.704 0.191 22.216)");
    assert.equal(dark.get("border"), "oklch(1 0 0 / 10%)");
    assert.equal(dark.get("input"), "oklch(1 0 0 / 15%)");
    assert.equal(dark.get("sidebar"), "oklch(0.205 0 0)");
    assert.equal(dark.get("sidebar-ring"), "oklch(0.556 0 0)");

    assert.equal(css.includes("264.376"), false);
    assert.equal(css.includes("264"), false);
  });
});
