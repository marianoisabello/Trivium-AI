import { expect, test } from "@playwright/test";
import {
  fillScenarioForm,
  organizationIdForEmail,
  saturateRateLimit,
  signupAndOnboard,
  uniqueEmail,
} from "./helpers";

test.describe("Rate limit de IA", () => {
  test("al superar AI_RATE_LIMIT_PER_HOUR la UI muestra un error claro", async ({ page }) => {
    const email = uniqueEmail("rate");
    await signupAndOnboard(page, {
      email,
      fullName: "QA Rate",
      orgName: `Org Rate ${Date.now()}`,
    });

    const orgId = await organizationIdForEmail(email);
    const limit = Number(process.env["AI_RATE_LIMIT_PER_HOUR"] ?? 30);
    await saturateRateLimit(orgId, limit);

    await page.goto("/escenarios");
    await fillScenarioForm(page, "Análisis rate limit");
    await page.getByRole("button", { name: "Generar escenarios", exact: true }).click();

    await expect(
      page.getByText(/Se alcanzó el límite de \d+ generaciones con IA por hora/),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Escenario Optimista")).toHaveCount(0);
  });
});
