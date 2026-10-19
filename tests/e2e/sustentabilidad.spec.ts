import { expect, test } from "@playwright/test";
import { signupAndOnboard, uniqueEmail } from "./helpers";

test.describe("Sustentabilidad", () => {
  test.beforeEach(async ({ page }) => {
    await signupAndOnboard(page, {
      email: uniqueEmail("sus"),
      fullName: "QA Sustentabilidad",
      orgName: `Org Sus ${Date.now()}`,
    });
  });

  test("genera iniciativas con meta, plan datado y 3–5 KPIs; registra una medición", async ({
    page,
  }) => {
    await page.goto("/sustentabilidad");
    await expect(page.getByRole("heading", { name: /Sustentabilidad/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.locator("#su-materials").fill("Acero reciclado y bioplásticos");
    await page.locator("#su-capacities").fill("Planta con línea de reutilización");
    await page.locator("#su-waste").fill("Viruta y cartón corrugado");
    await page.locator("#su-workforce").fill("Equipo de impacto de 15 personas");
    await page.getByRole("button", { name: "Generar propuestas", exact: true }).click();
    await expect(page.getByText("Iniciativas generadas")).toBeVisible({ timeout: 30_000 });

    const initiative = page
      .locator("text=/Programa de reutilización|Escuela de oficios|Corredor biológico/")
      .first();
    await expect(initiative).toBeVisible();

    // Meta medible + plan con fechas (ISO yyyy-mm-dd aparecen en el plan)
    await expect(page.getByText(/Reutilizar|Formar|Restaurar/).first()).toBeVisible();
    await expect(page.getByText(/\d{4}-\d{2}-\d{2}/).first()).toBeVisible();

    const editKpi = page.getByRole("button", { name: /^Editar KPI / }).first();
    await expect(editKpi).toBeVisible();
    // Contar KPIs editables en la primera iniciativa visible (3–5)
    const kpiButtons = page.getByRole("button", { name: /^Editar KPI / });
    const kpiCount = await kpiButtons.count();
    expect(kpiCount).toBeGreaterThanOrEqual(3);

    await editKpi.click();
    await expect(
      page.getByRole("heading", { name: "Editar KPI y registrar medición" }),
    ).toBeVisible();
    await expect(page.locator("#kpi-target")).not.toHaveValue("");
    await expect(page.locator("#kpi-unit")).not.toHaveValue("");
    await page.locator("#kpi-value").fill("12");
    await page.locator("#kpi-date").fill(new Date().toISOString().slice(0, 10));
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("KPI actualizado y medición registrada")).toBeVisible();
  });
});
