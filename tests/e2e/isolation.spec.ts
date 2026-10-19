import { expect, test } from "@playwright/test";
import { login, logout, signupAndOnboard, uniqueEmail } from "./helpers";

test.describe("Aislamiento entre organizaciones", () => {
  test("un usuario de la org A no ve datos de la org B", async ({ page }) => {
    const emailA = uniqueEmail("orga");
    const emailB = uniqueEmail("orgb");
    const orgA = `Org A ${Date.now()}`;
    const orgB = `Org B ${Date.now()}`;
    const clientA = `Cliente secreto A ${Date.now()}`;
    const clientB = `Cliente secreto B ${Date.now()}`;

    await signupAndOnboard(page, { email: emailA, fullName: "User A", orgName: orgA });
    await page.goto("/clientes");
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    await page.locator("#cl-name").fill(clientA);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Cliente agregado")).toBeVisible();
    await expect(page.getByText(clientA)).toBeVisible();
    await logout(page);

    await signupAndOnboard(page, { email: emailB, fullName: "User B", orgName: orgB });
    await page.goto("/clientes");
    await expect(page.getByText(clientA)).toHaveCount(0);
    await page.getByRole("button", { name: "Nuevo cliente" }).click();
    await page.locator("#cl-name").fill(clientB);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText(clientB)).toBeVisible();
    await logout(page);

    await login(page, emailA);
    await page.goto("/clientes");
    await expect(page.getByText(clientA)).toBeVisible();
    await expect(page.getByText(clientB)).toHaveCount(0);
    await expect(page.getByText(orgA).first()).toBeVisible();
    await expect(page.getByText(orgB)).toHaveCount(0);
  });
});
