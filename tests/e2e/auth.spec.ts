import { expect, test } from "@playwright/test";
import { completeOnboarding, login, logout, signup, uniqueEmail } from "./helpers";

test.describe("Auth y onboarding", () => {
  test("signup → bootstrap → onboarding → logout → login", async ({ page }) => {
    const email = uniqueEmail("auth");
    const orgName = `Org Auth ${Date.now()}`;

    await signup(page, { email, fullName: "QA Auth" });
    await completeOnboarding(page, orgName);
    await expect(page.getByRole("heading", { name: `Hola, ${orgName}` })).toBeVisible();

    await logout(page);
    await login(page, email);
    await expect(page.getByText("¡Bienvenido de nuevo!")).toBeVisible();
    await expect(page.getByRole("heading", { name: `Hola, ${orgName}` })).toBeVisible();
  });

  test("una sesión sin login es redirigida a /auth", async ({ page }) => {
    await page.goto("/escenarios");
    await expect(page).toHaveURL(/\/auth/, { timeout: 20_000 });
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth/, { timeout: 20_000 });
    await page.goto("/productos");
    await expect(page).toHaveURL(/\/auth/, { timeout: 20_000 });
  });
});
