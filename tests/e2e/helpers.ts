import { expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

export const TEST_PASSWORD = "TestPass123!";
export const ANALYSIS_NAME = "Cartera QA e2e";

let prismaSingleton: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  prismaSingleton ??= new PrismaClient({
    datasources: {
      db: {
        url:
          process.env["DATABASE_URL"] ??
          "postgresql://trivium:trivium@localhost:5433/trivium?schema=public",
      },
    },
  });
  return prismaSingleton;
}

export function uniqueEmail(prefix = "e2e"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@trivium.test`;
}

export async function signup(page: Page, opts: { email: string; fullName: string }): Promise<void> {
  await page.goto("/auth");
  await page.getByRole("tab", { name: "Crear cuenta" }).click();
  await page.locator("#name-up").fill(opts.fullName);
  await page.locator("#email-up").fill(opts.email);
  await page.locator("#pass-up").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 30_000 });
}

export async function completeOnboarding(
  page: Page,
  orgName: string,
  resources?: { materials?: string; capacities?: string },
): Promise<void> {
  await expect(page.getByRole("heading", { name: "Configurá tu organización" })).toBeVisible();
  await page.locator("#org-name").fill(orgName);
  await page.locator("#org-ind").fill("finanzas");
  await page.locator("#org-size").fill("11-50");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();

  await expect(page.locator("#res-materials")).toBeVisible({ timeout: 20_000 });
  await page.locator("#res-materials").fill(resources?.materials ?? "Acero y papel reciclable");
  await page
    .locator("#res-capacities")
    .fill(resources?.capacities ?? "Planta de ensamble y logística");
  await page.locator("#res-waste").fill("Viruta metálica y cartón");
  await page.locator("#res-workforce").fill("120 personas en planta");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();

  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByText(orgName).first()).toBeVisible();
}

export async function signupAndOnboard(
  page: Page,
  opts: { email: string; fullName: string; orgName: string },
): Promise<void> {
  await signup(page, opts);
  await completeOnboarding(page, opts.orgName);
}

export async function login(page: Page, email: string): Promise<void> {
  await page.goto("/auth");
  await page.getByRole("tab", { name: "Iniciar sesión" }).click();
  await page.locator("#email-in").fill(email);
  await page.locator("#pass-in").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Menú de usuario" }).click();
  await page.getByRole("menuitem", { name: /Cerrar sesión/ }).click();
  await expect(page).toHaveURL(/\/auth/, { timeout: 20_000 });
}

export async function fillScenarioForm(page: Page, name = ANALYSIS_NAME): Promise<void> {
  await page.locator("#an-name").fill(name);
  await page
    .locator("#an-sit")
    .fill("La cartera está expuesta al tipo de cambio y a la tasa de interés.");

  await page.getByRole("button", { name: "Activo", exact: true }).click();
  await page.getByLabel("Nombre del activo 1").fill("GGAL");
  await page.getByLabel("Valor del activo 1").fill("1500");
  await page.getByLabel("Peso del activo 1").fill("60");

  await page.getByLabel("Nombre del activo 2").fill("YPFD");
  await page.getByRole("combobox", { name: "Tipo del activo 2" }).click();
  await page.getByRole("option", { name: "derivado", exact: true }).click();
  await page.getByLabel("Valor del activo 2").fill("800");
  await page.getByLabel("Peso del activo 2").fill("40");

  await page.getByRole("button", { name: "Variable", exact: true }).click();
  await page.getByLabel("Nombre de la variable 1").fill("Tipo de cambio");
  await page.getByRole("combobox", { name: "Impacto de la variable 1" }).click();
  await page.getByRole("option", { name: "alto", exact: true }).click();

  await page.getByLabel("Nombre de la variable 2").fill("Tasa de interés");
  await page.getByRole("combobox", { name: "Impacto de la variable 2" }).click();
  await page.getByRole("option", { name: "bajo", exact: true }).click();
}

export async function generateScenariosFlow(page: Page, name = ANALYSIS_NAME): Promise<void> {
  await page.goto("/escenarios");
  await expect(page.getByRole("heading", { name: "Escenarios Futuros" })).toBeVisible({
    timeout: 20_000,
  });
  await fillScenarioForm(page, name);
  await page.getByRole("button", { name: "Generar escenarios", exact: true }).click();
  await expect(page.getByText("Escenario Optimista")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Escenario Esperado")).toBeVisible();
  await expect(page.getByText("Escenario Pesimista")).toBeVisible();
}

export async function organizationIdForEmail(email: string): Promise<string> {
  const profile = await getPrisma().profile.findFirst({
    where: { email },
    select: { organizationId: true },
  });
  if (!profile?.organizationId) {
    throw new Error(`No hay organizationId para ${email}`);
  }
  return profile.organizationId;
}

/** Satura el rate limit de la organización insertando filas reales en ai_call_logs. */
export async function saturateRateLimit(organizationId: string, limit: number): Promise<void> {
  const rows = Array.from({ length: limit }, () => ({
    organizationId,
    firebaseUid: "e2e-rate-limit",
    flow: "scenarios",
    provider: "mock",
    model: null,
    status: "success",
    attemptCount: 1,
    durationMs: 10,
  }));
  await getPrisma().aiCallLog.createMany({ data: rows });
}
