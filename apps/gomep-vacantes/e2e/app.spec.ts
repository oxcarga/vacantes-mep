import { expect, test, type Page } from "@playwright/test";
import { COLLECTIONS } from "@gomep/schema";
import {
  adminSdk,
  seedCatalogsAndVacancies,
  seedVerifiedUser,
} from "./helpers";

async function login(page: Page, email: string, password: string) {
  await page.goto("/");
  await expect(page.getByText("Cargando…")).toHaveCount(0);
  const logout = page.getByRole("button", { name: "Cerrar sesión" });
  if (await logout.isVisible()) {
    await logout.click();
    await expect(page.getByRole("tab", { name: "Entrar" })).toBeVisible();
  }
  await page.getByRole("tab", { name: "Entrar" }).click();
  const form = page.getByTestId("login-form");
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Entrar con contraseña" }).click();
}

test.beforeAll(async () => {
  await seedCatalogsAndVacancies();
  await seedVerifiedUser({
    email: "admin@example.com",
    password: "password12",
    role: "admin",
    name: "Admin",
    phone: "8888-0000",
  });
  const uid = await seedVerifiedUser({
    email: "docente@example.com",
    password: "password12",
    role: "docente",
    name: "Ana",
    phone: "8888-1111",
  });
  const { db } = adminSdk();
  await db.collection(COLLECTIONS.suscripciones).add({
    uid,
    regionalValue: "57",
    especialidad: "Español",
    status: "inactive",
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-31T00:00:00.000Z",
    endedAt: "2026-01-20T00:00:00.000Z",
    endReason: "expired",
    reminders: {},
  });
});

test("el panel de marca muestra el título y las tres líneas", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Cargando…")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Vacantes del MEP" })).toBeVisible();
  await expect(page.getByText("Plazas abiertas")).toBeVisible();
  await expect(page.getByText("Alertas por regional y especialidad")).toBeVisible();
  await expect(page.getByText("Acceso con correo verificado")).toBeVisible();
});

test("5.1 registro queda bloqueado hasta verificar el correo", async ({ page }) => {
  const email = `nuevo.${Date.now()}@example.com`;
  await page.goto("/");
  await page.locator('input[name="name"]').fill("Nora");
  await page.locator('input[name="phone"]').fill("8888-2222");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("password12");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByTestId("register-form")).toBeVisible();
  const link = page.getByTestId("dev-verify-link");
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", /mode=verifyEmail/);
  await page.goto("/vacantes");
  await expect(page.getByTestId("unverified-message")).toBeVisible();
  await expect(page.getByTestId("app-nav")).toHaveCount(0);
  await expect(page.getByTestId("vacantes-list")).toHaveCount(0);
});

test("5.2 enlace de verificación válido abre la shell; uno vencido se rechaza", async ({
  page,
}) => {
  const email = `verify.${Date.now()}@example.com`;
  await page.goto("/");
  await page.locator('input[name="name"]').fill("Vera");
  await page.locator('input[name="phone"]').fill("8888-3333");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("password12");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  const href = await page.getByTestId("dev-verify-link").getAttribute("href");
  await page.goto(href ?? "");
  await expect(page.getByTestId("app-nav")).toBeVisible();
  await expect(page.getByTestId("session-role")).toHaveText("docente");

  await page.goto("/auth/complete?mode=signIn&oobCode=codigo-vencido");
  await expect(page.getByTestId("link-error")).toBeVisible();
});

test("3.1 el magic link local se muestra bajo el botón y abre la sesión", async ({
  page,
}) => {
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  await page.goto("/");
  await expect(page.getByText("Cargando…")).toHaveCount(0);
  const logout = page.getByRole("button", { name: "Cerrar sesión" });
  if (await logout.isVisible()) {
    await logout.click();
    await expect(page.getByRole("tab", { name: "Entrar" })).toBeVisible();
  }
  await page.getByRole("tab", { name: "Entrar" }).click();
  await page
    .getByTestId("login-form")
    .locator('input[name="email"]')
    .fill("docente@example.com");
  await page.getByRole("button", { name: "Enviar magic link" }).click();
  await expect(page.getByTestId("auth-info")).toContainText("Revise su correo");
  const link = page.getByTestId("dev-magic-link");
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", /mode=signIn/);
  const href = await link.getAttribute("href");
  await page.goto(href ?? "");
  await expect(page.getByTestId("app-nav")).toBeVisible();
  await expect(page.getByTestId("session-role")).toHaveText("docente");
  await expect(page.getByTestId("link-error")).toHaveCount(0);
  expect(dialogs).toEqual([]);
});

test("1.3 un magic link sin correo guardado ni sesión no pide el correo", async ({
  page,
}) => {
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  await page.goto("/");
  await expect(page.getByText("Cargando…")).toHaveCount(0);
  const logout = page.getByRole("button", { name: "Cerrar sesión" });
  if (await logout.isVisible()) {
    await logout.click();
    await expect(page.getByRole("tab", { name: "Entrar" })).toBeVisible();
  }
  await page.evaluate(() => window.localStorage.removeItem("gomepEmailForSignIn"));
  await page.goto("/auth/complete?mode=signIn&oobCode=sin-correo");
  await expect(page.getByTestId("link-error")).toBeVisible();
  await expect(page.getByTestId("app-nav")).toHaveCount(0);
  expect(dialogs).toEqual([]);
});

async function logoutIfNeeded(page: Page) {
  await page.goto("/");
  await expect(page.getByText("Cargando…")).toHaveCount(0);
  const logout = page.getByRole("button", { name: "Cerrar sesión" });
  if (await logout.isVisible()) {
    await logout.click();
    await expect(page.getByRole("tab", { name: "Entrar" })).toBeVisible();
  }
}

test("2.2 un correo sin cuenta no recibe enlace", async ({ page }) => {
  await logoutIfNeeded(page);
  await page.getByRole("tab", { name: "Entrar" }).click();
  await page
    .getByTestId("login-form")
    .locator('input[name="email"]')
    .fill(`nadie.${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Enviar magic link" }).click();
  await expect(page.getByTestId("auth-info")).toContainText(
    "No hay una cuenta con ese correo",
  );
  await expect(page.getByTestId("dev-magic-link")).toHaveCount(0);
  await expect(page.getByTestId("dev-login-verify-link")).toHaveCount(0);
});

test("2.3 una cuenta sin verificar muestra el enlace de verificación", async ({
  page,
}) => {
  const email = `sinverificar.${Date.now()}@example.com`;
  await page.goto("/");
  await page.locator('input[name="name"]').fill("Nela");
  await page.locator('input[name="phone"]').fill("8888-4444");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("password12");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByTestId("dev-verify-link")).toBeVisible();
  await logoutIfNeeded(page);
  await page.getByRole("tab", { name: "Entrar" }).click();
  await page.getByTestId("login-form").locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Enviar magic link" }).click();
  await expect(page.getByTestId("auth-info")).toContainText("Primero valide su cuenta");
  const link = page.getByTestId("dev-login-verify-link");
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", /mode=verifyEmail/);
  await expect(page.getByTestId("dev-magic-link")).toHaveCount(0);
});

test("3.1 la verificación sin sesión no abre la app", async ({ page }) => {
  const email = `sinsesion.${Date.now()}@example.com`;
  await page.goto("/");
  await page.locator('input[name="name"]').fill("Lina");
  await page.locator('input[name="phone"]').fill("8888-5555");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("password12");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByTestId("dev-verify-link")).toBeVisible();
  await logoutIfNeeded(page);
  await page.getByRole("tab", { name: "Entrar" }).click();
  await page.getByTestId("login-form").locator('input[name="email"]').fill(email);
  await page.getByRole("button", { name: "Enviar magic link" }).click();
  const href = await page.getByTestId("dev-login-verify-link").getAttribute("href");
  await page.goto(href ?? "");
  await expect(page.getByTestId("verified-email-notice")).toContainText(
    "Su correo quedó verificado",
  );
  await expect(page.getByTestId("app-nav")).toHaveCount(0);
  await expect(page.getByTestId("vacantes-list")).toHaveCount(0);
});

const firstSeenFormat = new Intl.DateTimeFormat("es-CR", {
  timeZone: "America/Costa_Rica",
  day: "numeric",
  month: "short",
  year: "numeric",
});

test("6.1 el docente ve la vacante abierta y no la cerrada", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  await expect(page.getByTestId("vacante-1002")).toHaveCount(0);
});

test("6.3 la ficha muestra los datos de la vacante y omite Aplicar si no hay enlace", async ({
  page,
}) => {
  await login(page, "docente@example.com", "password12");
  const completa = page.getByTestId("vacante-1003");
  await expect(completa).toContainText("Inglés");
  await expect(completa).toContainText("1003");
  await expect(completa).toContainText("Regional Educación Santa Cruz");
  await expect(completa).not.toContainText("Etiqueta vieja");
  await expect(completa).toContainText("Liceo Pérez Zeledón");
  await expect(completa).toContainText("Profesor de Enseñanza Media");
  await expect(completa).toContainText("30");
  await expect(completa).toContainText(
    firstSeenFormat.format(new Date("2025-06-01T12:00:00.000Z")),
  );
  await expect(completa.getByRole("link", { name: "Aplicar" })).toHaveAttribute(
    "href",
    "https://example.com/aplicar/1003",
  );

  const minima = page.getByTestId("vacante-1004");
  await expect(minima).toContainText("Español");
  await expect(minima).toContainText("1004");
  await expect(minima).toContainText("Regional Educación Perez Zeledon");
  await expect(minima).toContainText(
    firstSeenFormat.format(new Date("2025-01-01T12:00:00.000Z")),
  );
  await expect(minima.getByRole("link", { name: "Aplicar" })).toHaveCount(0);
  await expect(page.getByTestId("vacante-1002")).toHaveCount(0);
});

test("6.4 las abiertas se ordenan por primera vista y el conteo las incluye", async ({
  page,
}) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  const ids = await page
    .getByTestId("vacantes-list")
    .locator("li")
    .evaluateAll((items) => items.map((item) => item.getAttribute("data-testid")));
  expect(ids.indexOf("vacante-1001")).toBeGreaterThanOrEqual(0);
  expect(ids.indexOf("vacante-1001")).toBeLessThan(ids.indexOf("vacante-1003"));
  await expect(page.getByTestId("vacantes-count")).toHaveText("3");
});

test("6.5 los filtros de regional y especialidad recortan la lista", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();

  await page.getByTestId("vacantes-regional").selectOption("57");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  await expect(page.getByTestId("vacante-1004")).toBeVisible();
  await expect(page.getByTestId("vacante-1003")).toHaveCount(0);

  await page.getByTestId("vacantes-regional").selectOption("");
  await page.getByTestId("vacantes-especialidad").selectOption("Inglés");
  await expect(page.getByTestId("vacante-1003")).toBeVisible();
  await expect(page.getByTestId("vacante-1001")).toHaveCount(0);

  await page.getByTestId("vacantes-regional").selectOption("78");
  await expect(page.getByTestId("vacante-1003")).toBeVisible();
  await expect(page.getByTestId("vacantes-count")).toHaveText("1");

  await page.getByTestId("vacantes-regional").selectOption("99");
  await page.getByTestId("vacantes-especialidad").selectOption("");
  await expect(page.locator("[data-testid^='vacante-']")).toHaveCount(0);
  await expect(page.getByTestId("vacantes-count")).toHaveText("0");
});

test("6.6 el filtro sin coincidencias no usa el mensaje de lista vacía", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  await page.getByTestId("vacantes-regional").selectOption("78");
  await page.getByTestId("vacantes-especialidad").selectOption("Español");
  await expect(page.getByTestId("vacantes-empty-filter")).toHaveText(
    "No hay vacantes abiertas de Español en Regional Educación Santa Cruz.",
  );
  await expect(page.getByTestId("vacantes-empty")).toHaveCount(0);

  const { db } = adminSdk();
  const open = await db.collection(COLLECTIONS.vacantes).where("active", "==", true).get();
  try {
    await Promise.all(open.docs.map((docSnap) => docSnap.ref.delete()));
    await expect(page.getByTestId("vacantes-empty")).toHaveText("No hay vacantes abiertas.");
    await expect(page.getByTestId("vacantes-empty-filter")).toHaveCount(0);
  } finally {
    await seedCatalogsAndVacancies();
  }
});

test("6.2 agregar, quitar y ver el par en historial", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  await page.getByTestId("nav-suscripciones").click();
  await page.getByTestId("subscribe-regional").selectOption("57");
  await page.getByTestId("subscribe-especialidad").selectOption("Español");
  await page.getByRole("button", { name: "Agregar" }).click();
  const active = page.locator("[data-testid^='sub-active-']");
  await expect(active).toHaveCount(1);
  await page.getByRole("button", { name: "Quitar" }).click();
  await expect(page.locator("[data-testid^='sub-inactive-']")).not.toHaveCount(0);
  await expect(active).toHaveCount(0);
});

test("7.1 el admin ve vacante cerrada y suscripción inactiva", async ({ page }) => {
  await login(page, "admin@example.com", "password12");
  await expect(page.getByTestId("admin-vacante-1002")).toHaveAttribute(
    "data-active",
    "false",
  );
  await expect(page.locator("[data-testid^='admin-sub-']").first()).toContainText(
    "inactive",
  );
});

test("7.2 promover un docente y bloquear degradar al único admin", async ({
  page,
}) => {
  await login(page, "admin@example.com", "password12");
  await page.getByTestId("promote-docente@example.com").click();
  await expect(page.getByTestId("user-docente@example.com")).toContainText("admin");
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("nav-admin")).toBeVisible();

  await login(page, "admin@example.com", "password12");
  await page.getByTestId("demote-docente@example.com").click();
  await page.getByTestId("demote-admin@example.com").click();
  await expect(page.getByTestId("admin-error")).toContainText("último admin");
});

test("7.3 el admin no tiene controles de suscripción", async ({ page }) => {
  await login(page, "admin@example.com", "password12");
  await expect(page.getByTestId("nav-suscripciones")).toHaveCount(0);
  await expect(page.getByTestId("subscribe-form")).toHaveCount(0);
  await page.goto("/suscripciones");
  await expect(page.getByTestId("subscribe-form")).toHaveCount(0);
});
