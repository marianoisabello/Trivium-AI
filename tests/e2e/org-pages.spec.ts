import { expect, test } from "@playwright/test";
import { signupAndOnboard, uniqueEmail } from "./helpers";

test.describe("Páginas de organización", () => {
  const orgName = `Org Pages ${Date.now()}`;
  let email: string;

  test.beforeAll(() => {
    email = uniqueEmail("pages");
  });

  test("Clientes, Configuración y Dashboard cargan datos de la organización", async ({ page }) => {
    email = uniqueEmail("pages");
    await signupAndOnboard(page, {
      email,
      fullName: "QA Pages",
      orgName,
    });

    await expect(page.getByRole("heading", { name: `Hola, ${orgName}` })).toBeVisible();
    await expect(page.getByText("Último análisis generado")).toBeVisible();
    await expect(page.getByText("Propuestas enviadas")).toBeVisible();
    await expect(page.getByText("Iniciativas en ejecución")).toBeVisible();
    await expect(page.getByText("Actividad reciente")).toBeVisible();

    await page.goto("/clientes");
    await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    await page.locator("#cl-name").fill("Cliente Org Pages");
    await page.locator("#cl-email").fill("cliente@org-pages.test");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Cliente agregado")).toBeVisible();
    await expect(page.getByText("Cliente Org Pages")).toBeVisible();

    await page.goto("/configuracion");
    await expect(page.getByRole("heading", { name: /Configuración/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator("#cf-org")).toHaveValue(orgName);
    await expect(page.locator("#cf-name")).toHaveValue("QA Pages");
    await page.locator("#cf-ind").fill("agroindustria");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Cambios guardados")).toBeVisible();
  });
});
