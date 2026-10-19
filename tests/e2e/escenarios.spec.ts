import { expect, test } from "@playwright/test";
import {
  ANALYSIS_NAME,
  fillScenarioForm,
  generateScenariosFlow,
  signupAndOnboard,
  uniqueEmail,
} from "./helpers";

test.describe("Escenarios futuros", () => {
  test.beforeEach(async ({ page }) => {
    await signupAndOnboard(page, {
      email: uniqueEmail("esc"),
      fullName: "QA Escenarios",
      orgName: `Org Esc ${Date.now()}`,
    });
  });

  test("rechaza campos vacíos sin llamar a la IA", async ({ page }) => {
    await page.goto("/escenarios");
    await expect(page.getByRole("heading", { name: "Escenarios Futuros" })).toBeVisible();
    await page.getByRole("button", { name: "Generar escenarios", exact: true }).click();

    await expect(page.getByText("El nombre debe tener al menos 3 caracteres")).toBeVisible();
    await expect(
      page.getByText("Describí la situación actual (mínimo 10 caracteres)"),
    ).toBeVisible();
    await expect(page.getByText("Cargá al menos un activo con nombre")).toBeVisible();
    await expect(page.getByText("Cargá al menos una variable independiente")).toBeVisible();
  });

  test("genera ≥3 escenarios con retorno, riesgo, probabilidad, drivers y narrativa", async ({
    page,
  }) => {
    await generateScenariosFlow(page);

    for (const type of ["Optimista", "Esperado", "Pesimista"] as const) {
      const title = page.getByText(`Escenario ${type}`, { exact: true });
      await expect(title).toBeVisible();
      const card = title.locator("xpath=ancestor::div[contains(@class,'rounded')][1]");
      await expect(card.getByText(/retorno esperado/i)).toBeVisible();
      await expect(card.getByText(/^[+-]?\d+(\.\d+)?%$/).first()).toBeVisible();
      await expect(card.getByText(/Probabilidad \d+%/)).toBeVisible();
      await expect(card.getByLabel(/^Riesgo /)).toBeVisible();
      await expect(card.getByText(/bajo|medio|alto/).first()).toBeVisible();
      await expect(card.locator("p").filter({ hasText: /./ }).first()).toBeVisible();
      await expect(card.getByText(/Tipo de cambio|Tasa de interés|impacto/i).first()).toBeVisible();
    }

    await expect(page.getByRole("listitem").filter({ hasText: ANALYSIS_NAME })).toBeVisible();
    await expect(page.getByText("completado").first()).toBeVisible();
  });

  test("aprueba un escenario y rechaza otro con motivo", async ({ page }) => {
    await generateScenariosFlow(page);

    await page.getByRole("button", { name: "Aprobar escenario Optimista" }).click();
    await expect(page.getByText("Escenario aprobado")).toBeVisible();
    await expect(page.getByText("aprobado").first()).toBeVisible();

    await page.getByRole("button", { name: "Rechazar escenario Pesimista" }).click();
    await expect(page.getByRole("heading", { name: "Rechazar escenario Pesimista" })).toBeVisible();
    await page.locator("#scenario-reject-reason").fill("Demasiado extremo para el contexto actual");
    await page.getByRole("button", { name: "Rechazar", exact: true }).click();
    await expect(page.getByText("Escenario rechazado")).toBeVisible();
    await expect(page.getByText("rechazado").first()).toBeVisible();
  });

  test("rechaza pesos de cartera que no suman 100%", async ({ page }) => {
    await page.goto("/escenarios");
    await fillScenarioForm(page);
    await page.getByLabel("Peso del activo 1").fill("40");
    await page.getByLabel("Peso del activo 2").fill("30");
    await page.getByRole("button", { name: "Generar escenarios", exact: true }).click();
    await expect(page.getByText("Los pesos de la cartera deben sumar 100%")).toBeVisible();
  });
});
