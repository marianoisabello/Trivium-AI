import { expect, test } from "@playwright/test";
import { signupAndOnboard, uniqueEmail } from "./helpers";

test.describe("Generador de productos", () => {
  test.beforeEach(async ({ page }) => {
    await signupAndOnboard(page, {
      email: uniqueEmail("prod"),
      fullName: "QA Productos",
      orgName: `Org Prod ${Date.now()}`,
    });
  });

  test("genera propuestas en borrador, edita y aprueba sin pasar a enviada solo", async ({
    page,
  }) => {
    await page.goto("/productos");
    await expect(
      page.getByRole("heading", { name: "Generador de Productos y Servicios" }),
    ).toBeVisible({ timeout: 20_000 });

    await page.locator("#seg").fill("PyMEs industriales");
    await page.getByRole("button", { name: "Generar propuestas", exact: true }).click();
    await expect(page.getByText("Propuestas generadas")).toBeVisible({ timeout: 30_000 });

    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < count; i += 1) {
      await expect(rows.nth(i).getByText("borrador")).toBeVisible();
      await expect(rows.nth(i).getByText("enviada")).toHaveCount(0);
    }

    const firstRow = rows.first();
    await firstRow.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByRole("heading", { name: "Editar propuesta" })).toBeVisible();
    await page.locator("#ed-name").fill("Propuesta editada e2e");
    await page.locator("#ed-desc").fill("Descripción actualizada por el test e2e.");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Propuesta actualizada")).toBeVisible();
    await expect(page.getByText("Propuesta editada e2e")).toBeVisible();
    await expect(page.getByText("borrador").first()).toBeVisible();

    await page
      .locator("tbody tr")
      .filter({ hasText: "Propuesta editada e2e" })
      .getByRole("button", { name: "Aprobar" })
      .click();
    await expect(page.getByText("Propuesta programada")).toBeVisible();
    await expect(
      page.locator("tbody tr").filter({ hasText: "Propuesta editada e2e" }).getByText("programada"),
    ).toBeVisible();
    await expect(
      page.locator("tbody tr").filter({ hasText: "Propuesta editada e2e" }).getByText("enviada"),
    ).toHaveCount(0);
  });
});
