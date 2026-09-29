import { expect, test, type Page } from "@playwright/test";
import {
  ANALYSIS_NAME,
  type BackendState,
  fillAssets,
  fillIdentity,
  fillVariables,
  installBackend,
  installGenerateRoute,
  mockScenarios,
  openEscenarios,
  setProbability,
} from "./helpers";

async function completeAnalysis(page: Page): Promise<void> {
  await fillIdentity(page);
  await fillAssets(page, [
    { name: "GGAL", weight: "60", value: "1500" },
    { name: "YPFD", weight: "40", value: "800" },
  ]);
  await page.getByRole("combobox", { name: "Tipo del activo 2" }).click();
  await page.getByRole("option", { name: "derivado", exact: true }).click();
  await fillVariables(page);
  await setProbability(page, 1, 70);
  await setProbability(page, 2, 30);
}

test.describe("Escenarios futuros", () => {
  let state: BackendState;

  test.beforeEach(async ({ page }) => {
    state = { history: [], generateCalls: 0 };
    await installBackend(page, state);
    await installGenerateRoute(page, state, {
      scenarios: mockScenarios(),
      analysisName: ANALYSIS_NAME,
      mode: "success",
      hold: false,
    });
    await openEscenarios(page);
  });

  test("rechaza campos vacíos", async ({ page }) => {
    await page.getByRole("button", { name: "Generar escenarios", exact: true }).click();

    await expect(page.getByText("El nombre debe tener al menos 3 caracteres")).toBeVisible();
    await expect(
      page.getByText("Describí la situación actual (mínimo 10 caracteres)"),
    ).toBeVisible();
    await expect(page.getByText("Cargá al menos un activo con nombre")).toBeVisible();
    await expect(page.getByText("Cargá al menos una variable independiente")).toBeVisible();
    expect(state.generateCalls).toBe(0);
  });

  test("rechaza pesos de cartera que no suman 100%", async ({ page }) => {
    await fillIdentity(page);
    await fillAssets(page, [
      { name: "GGAL", weight: "40" },
      { name: "YPFD", weight: "30" },
    ]);
    await fillVariables(page);
    await page.getByRole("button", { name: "Generar escenarios", exact: true }).click();
    await expect(page.getByText("Los pesos de la cartera deben sumar 100%")).toBeVisible();

    await page.getByLabel("Peso del activo 1").fill("80");
    await page.getByLabel("Peso del activo 2").fill("40");
    await page.getByRole("button", { name: "Generar escenarios", exact: true }).click();
    await expect(page.getByText("Los pesos de la cartera deben sumar 100%")).toBeVisible();
    expect(state.generateCalls).toBe(0);
  });

  test("mantiene la probabilidad entre 0 y 100", async ({ page }) => {
    const slider = page.getByRole("slider", { name: "Probabilidad de la variable 1" });
    await expect(slider).toHaveAttribute("aria-valuemin", "0");
    await expect(slider).toHaveAttribute("aria-valuemax", "100");

    await slider.focus();
    await slider.press("End");
    await slider.press("ArrowRight");
    await slider.press("PageUp");
    await expect(slider).toHaveAttribute("aria-valuenow", "100");
    await expect(page.getByText("100%", { exact: true })).toBeVisible();

    await slider.press("Home");
    await slider.press("ArrowLeft");
    await slider.press("PageDown");
    await expect(slider).toHaveAttribute("aria-valuenow", "0");
    await expect(page.getByText("0%", { exact: true })).toBeVisible();
  });

  test("genera tres escenarios, muestra la carga y los guarda en el historial", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    const { release } = await installGenerateRoute(page, state, {
      scenarios: mockScenarios(),
      analysisName: ANALYSIS_NAME,
      mode: "success",
      hold: true,
    });

    await completeAnalysis(page);
    await expect(page.getByText("Todavía no generaste análisis.")).toBeVisible();

    await page.getByRole("button", { name: "Generar escenarios", exact: true }).click();
    await expect(page.getByRole("button", { name: "Generando escenarios..." })).toBeVisible();
    await expect(page.locator(".animate-pulse").first()).toBeVisible();
    release();

    const optimista = page.locator(".rounded-xl").filter({ hasText: "Escenario Optimista" });
    const esperado = page.locator(".rounded-xl").filter({ hasText: "Escenario Esperado" });
    const pesimista = page.locator(".rounded-xl").filter({ hasText: "Escenario Pesimista" });

    await expect(optimista.getByText("+12.4%")).toBeVisible();
    await expect(optimista.getByText("bajo")).toBeVisible();
    await expect(optimista.getByText("El ciclo expansivo favorece a la cartera.")).toBeVisible();

    await expect(esperado.getByText("+4.2%")).toBeVisible();
    await expect(esperado.getByText("medio")).toBeVisible();
    await expect(
      esperado.getByText("Las variables se mantienen en rangos históricos."),
    ).toBeVisible();

    await expect(pesimista.getByText("-6.1%")).toBeVisible();
    await expect(pesimista.getByText("alto")).toBeVisible();
    await expect(
      pesimista.getByText("El impacto negativo de las variables reduce el retorno."),
    ).toBeVisible();

    const historyItem = page.getByRole("listitem").filter({ hasText: ANALYSIS_NAME });
    await expect(historyItem).toBeVisible();
    await expect(historyItem.getByText("completado")).toBeVisible();
    await expect(page.getByText(/fuente manual/i)).toHaveCount(0);
    expect(state.generateCalls).toBe(1);
    expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
  });

  test("muestra el error de la API y permite reintentar", async ({ page }) => {
    await installGenerateRoute(page, state, {
      scenarios: mockScenarios(),
      analysisName: ANALYSIS_NAME,
      mode: "error-then-success",
      hold: false,
    });
    await completeAnalysis(page);

    await page.getByRole("button", { name: "Generar escenarios", exact: true }).click();
    await expect(
      page.getByText("No pudimos generar los escenarios. Probá de nuevo en unos minutos."),
    ).toBeVisible();
    await expect(page.getByText("Escenario Optimista")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Generar escenarios", exact: true }),
    ).toBeEnabled();

    await page.getByRole("button", { name: "Generar escenarios", exact: true }).click();
    await expect(page.getByText("Escenario Optimista")).toBeVisible();
    await expect(page.getByText("Escenario Esperado")).toBeVisible();
    await expect(page.getByText("Escenario Pesimista")).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: ANALYSIS_NAME })).toBeVisible();
    expect(state.generateCalls).toBe(2);
  });

  test("indica cuando los datos de mercado vienen con fuente manual", async ({ page }) => {
    await installGenerateRoute(page, state, {
      scenarios: mockScenarios("manual"),
      analysisName: ANALYSIS_NAME,
      mode: "success",
      hold: false,
    });
    await completeAnalysis(page);
    await page.getByRole("button", { name: "Generar escenarios", exact: true }).click();

    await expect(page.getByRole("status").filter({ hasText: /fuente manual/i })).toBeVisible();
    await expect(page.getByText("Escenario Optimista")).toBeVisible();
  });
});
