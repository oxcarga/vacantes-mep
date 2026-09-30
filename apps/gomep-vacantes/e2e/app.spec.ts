import { expect, test, type Page } from "@playwright/test";
import { COLLECTIONS } from "@gomep/schema";
import {
  adminSdk,
  seedCatalogsAndVacancies,
  seedVerifiedUser,
  waitForOob,
} from "./helpers";

async function login(page: Page, email: string, password: string) {
  await page.goto("/");
  await expect(page.getByText("Cargando…")).toHaveCount(0);
  const logout = page.getByRole("button", { name: "Cerrar sesión" });
  if (await logout.isVisible()) {
    await logout.click();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  }
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
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

test("5.1 registro queda bloqueado hasta verificar el correo", async ({ page }) => {
  const email = `nuevo.${Date.now()}@example.com`;
  await page.goto("/");
  await page.locator('input[name="name"]').fill("Nora");
  await page.locator('input[name="phone"]').fill("8888-2222");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("password12");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
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
  await expect(page.getByTestId("unverified-message")).toBeVisible();

  const oob = await waitForOob(email, "VERIFY_EMAIL");
  await page.goto(`/auth/complete?mode=verifyEmail&oobCode=${oob.oobCode}`);
  await expect(page.getByTestId("app-nav")).toBeVisible();
  await expect(page.getByTestId("session-role")).toHaveText("docente");

  await page.goto("/auth/complete?mode=signIn&oobCode=codigo-vencido");
  await expect(page.getByTestId("link-error")).toBeVisible();
});

test("6.1 el docente ve la vacante abierta y no la cerrada", async ({ page }) => {
  await login(page, "docente@example.com", "password12");
  await expect(page.getByTestId("vacante-1001")).toBeVisible();
  await expect(page.getByTestId("vacante-1002")).toHaveCount(0);
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
