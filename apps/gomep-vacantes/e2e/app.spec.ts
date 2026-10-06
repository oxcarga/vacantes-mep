import { expect, test, type Page } from "@playwright/test";
import { COLLECTIONS } from "@gomep/schema";
import {
  adminSdk,
  elegirRegional,
  seedCatalogsAndVacancies,
  seedVerifiedUser,
  todasLasRegionales,
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
    regionalValue: "53",
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

  await elegirRegional(page, "53");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  await expect(page.getByTestId("vacante-1004")).toBeVisible();
  await expect(page.getByTestId("vacante-1003")).toHaveCount(0);

  await todasLasRegionales(page);
  await page.getByTestId("vacantes-especialidad").selectOption("Inglés");
  await expect(page.getByTestId("vacante-1003")).toBeVisible();
  await expect(page.getByTestId("vacante-1001")).toHaveCount(0);

  await elegirRegional(page, "62");
  await expect(page.getByTestId("vacante-1003")).toBeVisible();
  await expect(page.getByTestId("vacantes-count")).toHaveText("1");

  await todasLasRegionales(page);
  await elegirRegional(page, "99");
  await page.getByTestId("vacantes-especialidad").selectOption("");
  await expect(page.locator("[data-testid^='vacante-']")).toHaveCount(0);
  await expect(page.getByTestId("vacantes-count")).toHaveText("0");
});

test("6.6 el filtro sin coincidencias no usa el mensaje de lista vacía", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  await elegirRegional(page, "62");
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
  await page.getByTestId("subscribe-regional").selectOption("53");
  await page.getByTestId("subscribe-especialidad").selectOption("Español");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
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

test("8.1 la navegación marca la ruta activa", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  const nav = page.getByTestId("app-nav");
  const vacantes = nav.getByRole("link", { name: "Vacantes" });
  const suscripciones = page.getByTestId("nav-suscripciones");
  await expect(vacantes).toHaveAttribute("aria-current", "page");
  await expect(suscripciones).not.toHaveAttribute("aria-current", /.*/);

  await suscripciones.click();
  await expect(page).toHaveURL(/\/suscripciones$/);
  await expect(suscripciones).toHaveAttribute("aria-current", "page");
  await expect(vacantes).not.toHaveAttribute("aria-current", /.*/);
});

test("8.2 en móvil la sesión sigue ofreciendo cerrar sesión y el rol", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("app-nav")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  await expect(page.getByTestId("session-role")).toHaveText("docente");
});

test("9.1 la ficha marca como Nueva la vacante vista hoy", async ({ page }) => {
  const ref = adminSdk().db.collection(COLLECTIONS.vacantes).doc("1001");
  const hoy = new Date().toISOString();
  await ref.update({ firstSeen: hoy });
  try {
    await login(page, "docente@example.com", "password12");
    const nueva = page.getByTestId("vacante-1001");
    await expect(nueva).toContainText("Nueva");
    await expect(nueva).toContainText(firstSeenFormat.format(new Date(hoy)));
    const vieja = page.getByTestId("vacante-1003");
    await expect(vieja).toContainText(
      firstSeenFormat.format(new Date("2025-06-01T12:00:00.000Z")),
    );
    await expect(vieja).not.toContainText("Nueva");
  } finally {
    await ref.update({ firstSeen: "2026-01-01T00:00:00.000Z" });
  }
});

test("9.2 la ficha muestra las lecciones y Aplicar abre en otra pestaña", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  const completa = page.getByTestId("vacante-1003");
  await expect(completa).toContainText("30 lecciones");
  await expect(completa.getByRole("link", { name: "Aplicar" })).toHaveAttribute(
    "target",
    "_blank",
  );
});

test("9.3 el conteo se lee como frase en singular o plural", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  const frase = page.locator("p[aria-live='polite']");
  await expect(frase).toHaveText("3 vacantes");
  await expect(page.getByTestId("vacantes-count")).toHaveText("3");

  await page.getByTestId("vacantes-especialidad").selectOption("Inglés");
  await elegirRegional(page, "62");
  await expect(frase).toHaveText("1 vacante");
  await expect(page.getByTestId("vacantes-count")).toHaveText("1");
});

test("9.4 la especialidad sigue siendo un select y la regional un botón", async ({
  page,
}) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  const regional = await page.getByTestId("vacantes-regional").evaluate((el) => el.tagName);
  const especialidad = await page
    .getByTestId("vacantes-especialidad")
    .evaluate((el) => el.tagName);
  expect(regional).toBe("BUTTON");
  expect(especialidad).toBe("SELECT");
});

test("9.5 los filtros activos se ven y se quitan uno a uno o todos", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  const chipRegional = page.getByTestId("vacantes-filtro-regional-62");
  const chipEspecialidad = page.getByTestId("vacantes-filtro-especialidad");
  const limpiar = page.getByTestId("vacantes-limpiar");
  await expect(chipRegional).toHaveCount(0);
  await expect(chipEspecialidad).toHaveCount(0);
  await expect(limpiar).toHaveCount(0);

  await elegirRegional(page, "62");
  await page.getByTestId("vacantes-especialidad").selectOption("Inglés");
  await expect(chipRegional).toHaveText("Regional Educación Santa Cruz");
  await expect(chipEspecialidad).toHaveText("Inglés");
  await expect(limpiar).toBeVisible();

  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Quitar filtro: Regional Educación Santa Cruz" })
    .click();
  await expect(chipRegional).toHaveCount(0);
  await expect(chipEspecialidad).toHaveText("Inglés");
  await expect(page.getByTestId("vacantes-regional")).toHaveText("Todas las regionales");
  await expect(page.getByTestId("vacante-1003")).toBeVisible();
  await expect(page.getByTestId("vacante-1001")).toHaveCount(0);

  await elegirRegional(page, "62");
  await limpiar.click();
  await expect(page.getByTestId("vacantes-regional")).toHaveText("Todas las regionales");
  await expect(page.getByTestId("vacantes-especialidad")).toHaveValue("");
  await expect(page.getByTestId("vacantes-count")).toHaveText("3");
  await expect(chipRegional).toHaveCount(0);
  await expect(chipEspecialidad).toHaveCount(0);
  await expect(limpiar).toHaveCount(0);
});

test("9.6 el filtro sin coincidencias ofrece limpiar filtros", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  await elegirRegional(page, "62");
  await page.getByTestId("vacantes-especialidad").selectOption("Español");
  const limpiar = page.getByTestId("vacantes-empty-filter-limpiar");
  await expect(limpiar).toBeVisible();
  await limpiar.click();
  await expect(page.getByTestId("vacantes-empty-filter")).toHaveCount(0);
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
});

test("9.13 el dropdown de regionales acepta varias y se cierra con Escape", async ({
  page,
}) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  const regional = page.getByTestId("vacantes-regional");
  const especialidad = page.getByTestId("vacantes-especialidad");
  const lista = page.getByTestId("vacantes-regional-lista");
  await expect(regional).toHaveText("Todas las regionales");

  await elegirRegional(page, "53");
  await elegirRegional(page, "62");
  await expect(lista).toBeVisible();
  await expect(page.getByTestId("vacantes-regional-opcion-53")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByTestId("vacantes-regional-opcion-62")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(regional).toHaveText("2 regionales");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  await expect(page.getByTestId("vacante-1004")).toBeVisible();
  await expect(page.getByTestId("vacante-1003")).toBeVisible();

  await page.getByTestId("vacantes-regional-opcion-62").click();
  await expect(regional).toHaveText("Regional Educación Perez Zeledon");
  await expect(page.getByTestId("vacante-1003")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(regional).toHaveAttribute("aria-expanded", "false");
  await expect(lista).toHaveCount(0);

  await especialidad.selectOption("Inglés");
  await todasLasRegionales(page);
  await expect(page.getByTestId("vacante-1003")).toBeVisible();
  await expect(especialidad).toHaveValue("Inglés");

  await especialidad.selectOption("Español");
  await especialidad.selectOption("Inglés");
  await expect(especialidad).toHaveValue("Inglés");
  await expect(page.getByTestId("vacante-1001")).toHaveCount(0);
  await expect(page.getByTestId("vacante-1003")).toBeVisible();

  expect(await regional.evaluate((el) => el.tagName)).toBe("BUTTON");
  expect(await especialidad.evaluate((el) => el.tagName)).toBe("SELECT");
});

test("9.14 cada regional elegida es una píldora y la X la desmarca", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  await expect(page.locator("[data-testid^='vacantes-filtro-']")).toHaveCount(0);
  await expect(page.getByTestId("vacantes-limpiar")).toHaveCount(0);

  await elegirRegional(page, "62");
  await elegirRegional(page, "53");
  const pills = page.locator("[data-testid^='vacantes-filtro-regional-']");
  await expect(pills).toHaveCount(2);
  await expect(pills.nth(0)).toHaveText("Regional Educación Perez Zeledon");
  await expect(pills.nth(1)).toHaveText("Regional Educación Santa Cruz");
  await expect(page.getByTestId("vacantes-filtro-especialidad")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Quitar filtro: Regional Educación Perez Zeledon" }).click();
  await page.getByTestId("vacantes-regional").click();
  await expect(page.getByTestId("vacantes-regional-opcion-53")).toHaveAttribute(
    "aria-selected",
    "false",
  );
  await expect(page.getByTestId("vacantes-filtro-regional-62")).toHaveText(
    "Regional Educación Santa Cruz",
  );
  await expect(page.getByTestId("vacantes-filtro-regional-53")).toHaveCount(0);
  await expect(page.getByTestId("vacantes-regional")).toHaveText(
    "Regional Educación Santa Cruz",
  );

  await page.getByTestId("vacantes-especialidad").selectOption("Inglés");
  await expect(page.getByTestId("vacante-1003")).toBeVisible();
  await expect(page.getByTestId("vacante-1001")).toHaveCount(0);
});

test("9.15 la píldora de especialidad usa verde claro y la de regional primary", async ({
  page,
}) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  await elegirRegional(page, "53");
  await page.getByTestId("vacantes-especialidad").selectOption("Inglés");
  await expect(page.getByTestId("vacantes-filtro-regional-53")).toHaveClass(/bg-primary\/10/);
  await expect(page.getByTestId("vacantes-filtro-regional-53")).toHaveClass(/text-primary/);
  await expect(page.getByTestId("vacantes-filtro-especialidad")).toHaveClass(/bg-green-200/);
  await expect(page.getByTestId("vacantes-filtro-especialidad")).toHaveClass(/text-green-900/);
});

test("9.16 dos regionales sin coincidencias nombran ambas unidas por o", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  await elegirRegional(page, "62");
  await elegirRegional(page, "99");
  await page.getByTestId("vacantes-especialidad").selectOption("Español");
  await expect(page.getByTestId("vacantes-empty-filter")).toHaveText(
    "No hay vacantes abiertas de Español en Regional Educación Santa Cruz o en Regional sin vacantes.",
  );
  await expect(page.getByTestId("vacantes-empty")).toHaveCount(0);
});

test("9.17 el listbox cabe en la pantalla y las píldoras pasan de línea", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 800 });
  await elegirRegional(page, "53");
  await elegirRegional(page, "62");
  const pills = page.locator("[data-testid^='vacantes-filtro-regional-']");
  const first = await pills.nth(0).boundingBox();
  const second = await pills.nth(1).boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(second!.y).toBeGreaterThan(first!.y);

  const lista = page.getByTestId("vacantes-regional-lista");
  const listBox = await lista.boundingBox();
  expect(listBox).not.toBeNull();
  expect(listBox!.x).toBeGreaterThanOrEqual(0);
  expect(listBox!.x + listBox!.width).toBeLessThanOrEqual(390);

  await page.setViewportSize({ width: 1280, height: 800 });
  const wide = await lista.boundingBox();
  expect(wide).not.toBeNull();
  expect(wide!.x).toBeGreaterThanOrEqual(0);
  expect(wide!.x + wide!.width).toBeLessThanOrEqual(1280);
});

test("9.7 mientras cargan las vacantes no se dice que no hay", async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const listen = "**/google.firestore.v1.Firestore/Listen/**";
  await page.route(listen, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await login(page, "docente@example.com", "password12");
    await expect(page.getByTestId("vacantes-loading")).toBeVisible();
    await expect(page.getByTestId("vacantes-empty")).toHaveCount(0);
    await expect(page.locator("[data-testid^='vacante-']")).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  await expect(page.getByTestId("vacantes-loading")).toHaveCount(0);
  await page.unroute(listen);
});

test("9.8 sin vacantes abiertas se ofrece ir a suscripciones", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  const { db } = adminSdk();
  const open = await db.collection(COLLECTIONS.vacantes).where("active", "==", true).get();
  try {
    await Promise.all(open.docs.map((docSnap) => docSnap.ref.delete()));
    await expect(page.getByTestId("vacantes-empty")).toHaveText("No hay vacantes abiertas.");
    const link = page.getByTestId("vacantes-empty-suscripciones");
    await expect(link).toHaveAttribute("href", "/suscripciones");
    await link.click();
    await expect(page).toHaveURL(/\/suscripciones$/);
  } finally {
    await seedCatalogsAndVacancies();
  }
});

async function docenteUid() {
  const user = await adminSdk().auth.getUserByEmail("docente@example.com");
  return user.uid;
}

function suscripcionesRef() {
  return adminSdk().db.collection(COLLECTIONS.suscripciones);
}

async function clearActiveSubs(uid: string) {
  const owned = await suscripcionesRef().where("uid", "==", uid).get();
  await Promise.all(
    owned.docs.filter((docSnap) => docSnap.get("status") === "active").map((docSnap) => docSnap.ref.delete()),
  );
}

async function openSuscripciones(page: Page, email = "docente@example.com") {
  await login(page, email, "password12");
  await page.getByTestId("nav-suscripciones").click();
  await expect(page).toHaveURL(/\/suscripciones$/);
}

test("10.1 el panel ordena las regionales y conserva los selects", async ({ page }) => {
  await openSuscripciones(page);
  await expect(page.getByText("Avisos durante 30 días por un par de regional y especialidad.")).toBeVisible();
  const regional = page.getByTestId("subscribe-regional");
  const especialidad = page.getByTestId("subscribe-especialidad");
  await expect(regional).toHaveJSProperty("tagName", "SELECT");
  await expect(especialidad).toHaveJSProperty("tagName", "SELECT");
  const labels = await regional.locator("option").allTextContents();
  const names = labels.slice(1);
  const sorted = [...names].sort((a, b) => a.localeCompare(b, "es"));
  expect(names).toEqual(sorted);
  const perez = names.indexOf("Regional Educación Perez Zeledon");
  const santa = names.indexOf("Regional Educación Santa Cruz");
  const sin = names.indexOf("Regional sin vacantes");
  expect(perez).toBeGreaterThanOrEqual(0);
  expect(perez).toBeLessThan(santa);
  expect(santa).toBeLessThan(sin);
});

test("10.2 la ficha activa muestra la etiqueta y la fecha de Costa Rica", async ({ page }) => {
  const uid = await docenteUid();
  const catalogo = "e2e-sub-activa-53";
  const ausente = "e2e-sub-activa-00";
  const base = {
    uid,
    status: "active",
    createdAt: "2026-02-01T00:00:00.000Z",
    expiresAt: "2026-01-31T00:00:00.000Z",
    endedAt: null,
    endReason: null,
    reminders: {},
  };
  await suscripcionesRef().doc(catalogo).set({
    ...base,
    regionalValue: "53",
    especialidad: "Español",
  });
  await suscripcionesRef().doc(ausente).set({
    ...base,
    regionalValue: "00",
    especialidad: "Francés",
    createdAt: "2026-02-02T00:00:00.000Z",
  });
  try {
    await openSuscripciones(page);
    const conocida = page.getByTestId(`sub-active-${catalogo}`);
    await expect(conocida).toContainText("Español");
    await expect(conocida).toContainText("Regional Educación Perez Zeledon");
    await expect(conocida).toContainText("Vence el 30 ene 2026");
    await expect(conocida).not.toContainText("53");
    await expect(conocida.getByRole("button", { name: "Quitar" })).toBeVisible();
    await expect(page.getByTestId(`sub-active-${ausente}`)).toContainText("00");
  } finally {
    await suscripcionesRef().doc(catalogo).delete();
    await suscripcionesRef().doc(ausente).delete();
  }
});

test("10.3 el conteo distingue singular y la más reciente va primero", async ({ page }) => {
  const uid = await docenteUid();
  await clearActiveSubs(uid);
  const reciente = "e2e-sub-reciente";
  const antigua = "e2e-sub-antigua";
  const base = {
    uid,
    status: "active",
    expiresAt: "2026-04-01T12:00:00.000Z",
    endedAt: null,
    endReason: null,
    reminders: {},
  };
  await suscripcionesRef().doc(reciente).set({
    ...base,
    regionalValue: "62",
    especialidad: "Inglés",
    createdAt: "2026-03-02T00:00:00.000Z",
  });
  await suscripcionesRef().doc(antigua).set({
    ...base,
    regionalValue: "99",
    especialidad: "Matemática",
    createdAt: "2026-03-01T00:00:00.000Z",
  });
  try {
    await openSuscripciones(page);
    const frase = page.locator("p[aria-live='polite']");
    const items = page.getByTestId("subs-active").locator(":scope > li");
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText("Inglés");
    await expect(items.nth(1)).toContainText("Matemática");
    await expect(page.getByTestId("subs-count")).toHaveText("2");
    await expect(frase).toHaveText("2 activas");
    await suscripcionesRef().doc(reciente).delete();
    await expect(page.getByTestId("subs-count")).toHaveText("1");
    await expect(frase).toHaveText("1 activa");
  } finally {
    await suscripcionesRef().doc(reciente).delete();
    await suscripcionesRef().doc(antigua).delete();
  }
});

test("10.4 el historial dice el motivo en español", async ({ page }) => {
  const uid = await docenteUid();
  const quitada = "e2e-sub-quitada";
  await suscripcionesRef().doc(quitada).set({
    uid,
    regionalValue: "62",
    especialidad: "Ciencias",
    status: "inactive",
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-31T00:00:00.000Z",
    endedAt: "2026-01-15T00:00:00.000Z",
    endReason: "removed",
    reminders: {},
  });
  try {
    await openSuscripciones(page);
    const vencida = page.locator("[data-testid^='sub-inactive-']").filter({ hasText: "Venció" });
    await expect(vencida.first()).toContainText("Regional Educación Perez Zeledon");
    await expect(vencida.first()).not.toContainText("expired");
    const removida = page.getByTestId(`sub-inactive-${quitada}`);
    await expect(removida).toContainText("La quitaste");
    await expect(removida).not.toContainText("removed");
  } finally {
    await suscripcionesRef().doc(quitada).delete();
  }
});

test("10.5 agregar de nuevo usa el par de la ficha", async ({ page }) => {
  const uid = await docenteUid();
  const owned = await suscripcionesRef().where("uid", "==", uid).get();
  const expiredId = owned.docs.find(
    (docSnap) =>
      docSnap.get("endReason") === "expired" && docSnap.get("especialidad") === "Español",
  )?.id;
  if (!expiredId) throw new Error("falta la suscripción vencida del semillero");
  await clearActiveSubs(uid);
  try {
    await openSuscripciones(page);
    const reabrir = page.getByTestId(`resubscribe-${expiredId}`);
    await expect(reabrir).toBeVisible();
    await page.getByTestId("subscribe-regional").selectOption("53");
    await page.getByTestId("subscribe-especialidad").selectOption("Español");
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    await expect(reabrir).toHaveCount(0);
    await page.getByRole("button", { name: "Quitar" }).click();
    await expect(reabrir).toBeVisible();
    await page.getByTestId("subscribe-regional").selectOption("62");
    await page.getByTestId("subscribe-especialidad").selectOption("Inglés");
    await reabrir.click();
    const nueva = page.getByTestId("subs-active").locator("[data-testid^='sub-active-']");
    await expect(nueva).toHaveCount(1);
    await expect(nueva).toContainText("Español");
    await expect(nueva).toContainText("Regional Educación Perez Zeledon");
    await expect(nueva).not.toContainText("Inglés");
    await expect(page.getByTestId(`sub-inactive-${expiredId}`)).toBeVisible();
  } finally {
    await clearActiveSubs(uid);
  }
});

test("10.6 mientras cargan las suscripciones no se dice que no hay", async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const listen = "**/google.firestore.v1.Firestore/Listen/**";
  await page.route(listen, async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await login(page, "docente@example.com", "password12");
    await page.getByTestId("nav-suscripciones").click();
    await expect(page.getByTestId("subs-loading")).toBeVisible();
    await expect(page.getByTestId("subs-empty-active")).toHaveCount(0);
    await expect(page.locator("[data-testid^='sub-active-']")).toHaveCount(0);
    await expect(page.locator("[data-testid^='sub-inactive-']")).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.getByTestId("subs-loading")).toHaveCount(0);
  await page.unroute(listen);
});

test("10.7 los vacíos de activas e historial son distintos", async ({ page }) => {
  const uid = await docenteUid();
  await clearActiveSubs(uid);
  await openSuscripciones(page);
  await expect(page.getByTestId("subs-empty-active")).toHaveText("No tienes suscripciones activas.");
  await expect(page.getByTestId("subs-empty-history")).toHaveCount(0);

  const email = `vacio.${Date.now()}@example.com`;
  await seedVerifiedUser({
    email,
    password: "password12",
    role: "docente",
    name: "Vacio",
    phone: "8888-3333",
  });
  await openSuscripciones(page, email);
  await expect(page.getByTestId("subs-empty-active")).toHaveText("No tienes suscripciones activas.");
  await expect(page.getByTestId("subs-empty-history")).toHaveText("Todavía no hay historial.");
});

test("10.8 el historial se apila en filas", async ({ page }) => {
  const uid = await docenteUid();
  const owned = await suscripcionesRef().where("uid", "==", uid).get();
  await Promise.all(owned.docs.map((docSnap) => docSnap.ref.delete()));
  const quitada = "e2e-sub-fila-quitada";
  const vencida = "e2e-sub-fila-vencida";
  const activa = "e2e-sub-fila-activa";
  await suscripcionesRef().doc(quitada).set({
    uid,
    regionalValue: "62",
    especialidad: "Ciencias",
    status: "inactive",
    createdAt: "2026-02-01T00:00:00.000Z",
    expiresAt: "2026-03-01T00:00:00.000Z",
    endedAt: "2026-02-15T00:00:00.000Z",
    endReason: "removed",
    reminders: {},
  });
  await suscripcionesRef().doc(vencida).set({
    uid,
    regionalValue: "53",
    especialidad: "Español",
    status: "inactive",
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-31T00:00:00.000Z",
    endedAt: "2026-01-20T00:00:00.000Z",
    endReason: "expired",
    reminders: {},
  });
  await suscripcionesRef().doc(activa).set({
    uid,
    regionalValue: "99",
    especialidad: "Matemática",
    status: "active",
    createdAt: "2026-03-01T00:00:00.000Z",
    expiresAt: "2026-04-01T00:00:00.000Z",
    endedAt: null,
    endReason: null,
    reminders: {},
  });
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openSuscripciones(page);
    const rows = page.getByTestId("subs-history").locator(":scope > li");
    await expect(rows).toHaveCount(2);
    const first = await rows.nth(0).boundingBox();
    const second = await rows.nth(1).boundingBox();
    if (!first || !second) throw new Error("faltan las filas del historial");
    expect(second.y).toBeGreaterThanOrEqual(first.y + first.height - 2);
    expect(Math.abs(first.x - second.x)).toBeLessThan(8);
    await expect(page.getByTestId("subs-active").getByTestId(`sub-active-${activa}`)).toBeVisible();
    const removida = page.getByTestId(`sub-inactive-${quitada}`);
    await expect(removida).toContainText("La quitaste");
    await expect(removida).not.toContainText("removed");
    await expect(removida).toContainText("Regional Educación Santa Cruz");
    await expect(page.getByTestId(`resubscribe-${quitada}`)).toBeVisible();
  } finally {
    await suscripcionesRef().doc(quitada).delete();
    await suscripcionesRef().doc(vencida).delete();
    await suscripcionesRef().doc(activa).delete();
    await suscripcionesRef().add({
      uid,
      regionalValue: "53",
      especialidad: "Español",
      status: "inactive",
      createdAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-31T00:00:00.000Z",
      endedAt: "2026-01-20T00:00:00.000Z",
      endReason: "expired",
      reminders: {},
    });
  }
});
