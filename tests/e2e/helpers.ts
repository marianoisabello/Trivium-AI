import { expect, type Page, type Route } from "@playwright/test";
import { toCrossJSONAsync } from "seroval";

const SUPABASE_REF = "cyefhfvxwsptobwosvhh";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const ORG_ID = "22222222-2222-4222-8222-222222222222";

export const ANALYSIS_NAME = "Cartera QA septiembre";

export interface HistoryItem {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export interface MockScenario {
  id: string;
  type: "Optimista" | "Esperado" | "Pesimista";
  expectedReturn: number;
  risk: "bajo" | "medio" | "alto";
  probability: number;
  narrative: string;
  drivers: string[];
  dataSource?: "manual" | "api";
}

export interface BackendState {
  history: HistoryItem[];
  generateCalls: number;
}

/**
 * La Fase 1 no expone REST `/api/*`: la generación es una server function
 * (`POST /_serverFn/<id>`), el reemplazo de `/api/scenarios/generate`.
 * Interceptamos ambas URLs para no llamar a Vertex.
 */
function isGenerateRequest(url: URL): boolean {
  return url.pathname.endsWith("/api/scenarios/generate") || url.pathname.includes("/_serverFn/");
}

export function mockScenarios(dataSource?: "manual" | "api"): MockScenario[] {
  const scenarios: MockScenario[] = [
    {
      id: "opt-1",
      type: "Optimista",
      expectedReturn: 12.4,
      risk: "bajo",
      probability: 25,
      narrative: "El ciclo expansivo favorece a la cartera.",
      drivers: ["Tipo de cambio"],
    },
    {
      id: "esp-1",
      type: "Esperado",
      expectedReturn: 4.2,
      risk: "medio",
      probability: 50,
      narrative: "Las variables se mantienen en rangos históricos.",
      drivers: ["Tasa de interés"],
    },
    {
      id: "pes-1",
      type: "Pesimista",
      expectedReturn: -6.1,
      risk: "alto",
      probability: 25,
      narrative: "El impacto negativo de las variables reduce el retorno.",
      drivers: ["Demanda del sector"],
    },
  ];
  if (!dataSource) return scenarios;
  return scenarios.map((scenario) => ({ ...scenario, dataSource }));
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function accessToken(): string {
  const now = Math.floor(Date.now() / 1000);
  return [
    encode({ alg: "HS256", typ: "JWT" }),
    encode({
      sub: USER_ID,
      email: "qa@trivium.test",
      role: "authenticated",
      aud: "authenticated",
      exp: now + 60 * 60,
      iat: now,
    }),
    "e2e-signature",
  ].join(".");
}

function userPayload() {
  return {
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "qa@trivium.test",
    email_confirmed_at: "2026-01-01T00:00:00.000Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "QA Trivium" },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

function corsHeaders(route: Route): Record<string, string> {
  const headers = route.request().headers();
  return {
    "access-control-allow-origin": headers["origin"] ?? "http://127.0.0.1:5173",
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": headers["access-control-request-headers"] ?? "*",
    "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  };
}

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    headers: { ...corsHeaders(route), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function installBackend(page: Page, state: BackendState): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const session = {
    access_token: accessToken(),
    refresh_token: "e2e-refresh-token",
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: "bearer",
    user: userPayload(),
  };

  await page.addInitScript(
    ({ storageKey, stored }) => {
      localStorage.setItem(storageKey, JSON.stringify(stored));
    },
    { storageKey: `sb-${SUPABASE_REF}-auth-token`, stored: session },
  );

  await page.route(
    (url) => url.hostname.endsWith("supabase.co"),
    async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: corsHeaders(route) });
        return;
      }

      const url = new URL(request.url());
      if (url.pathname.endsWith("/auth/v1/user")) {
        await fulfillJson(route, userPayload());
        return;
      }
      if (url.pathname.includes("/auth/v1/token")) {
        await fulfillJson(route, session);
        return;
      }
      if (url.pathname.includes("/rest/v1/profiles")) {
        await fulfillJson(route, { full_name: "QA Trivium", organization_id: ORG_ID });
        return;
      }
      if (url.pathname.includes("/rest/v1/user_roles")) {
        await fulfillJson(route, [{ role: "admin" }]);
        return;
      }
      if (url.pathname.includes("/rest/v1/organizations")) {
        await fulfillJson(route, {
          id: ORG_ID,
          name: "Trivium QA",
          industry: "finanzas",
          size: "11-50",
          onboarding_completed: true,
        });
        return;
      }
      if (url.pathname.includes("/rest/v1/analyses")) {
        await fulfillJson(route, state.history);
        return;
      }

      await fulfillJson(route, []);
    },
  );
}

export async function installGenerateRoute(
  page: Page,
  state: BackendState,
  options: {
    scenarios: MockScenario[];
    analysisName: string;
    mode: "success" | "error-then-success";
    hold: boolean;
  },
): Promise<{ release: () => void }> {
  let release = () => {};
  const gate = options.hold
    ? new Promise<void>((resolve) => {
        release = resolve;
      })
    : Promise.resolve();

  const handler = async (route: Route) => {
    if (!isGenerateRequest(new URL(route.request().url()))) {
      await route.continue();
      return;
    }
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    state.generateCalls += 1;
    await gate;

    const fail = options.mode === "error-then-success" && state.generateCalls === 1;
    if (fail) {
      await route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "error interno",
      });
      return;
    }

    state.history = [
      {
        id: "analysis-e2e-1",
        name: options.analysisName,
        status: "completado",
        created_at: "2026-09-24T18:00:00.000Z",
      },
    ];

    const payload = await toCrossJSONAsync({ result: options.scenarios });
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-tss-serialized": "true",
      },
      body: JSON.stringify(payload),
    });
  };

  await page.route("**/api/scenarios/generate", handler);
  await page.route("**/_serverFn/**", handler);
  return { release };
}

export async function openEscenarios(page: Page): Promise<void> {
  await page.goto("/escenarios");
  await expect(page.getByRole("heading", { name: "Escenarios Futuros" })).toBeVisible({
    timeout: 20_000,
  });
}

export async function fillIdentity(page: Page, name = ANALYSIS_NAME): Promise<void> {
  await page.getByLabel("Nombre del análisis *").fill(name);
  await page
    .getByLabel("Situación actual *")
    .fill("La cartera está expuesta al tipo de cambio y a la tasa de interés.");
}

export async function fillAssets(
  page: Page,
  assets: { name: string; weight: string; value?: string }[],
): Promise<void> {
  for (let i = 1; i < assets.length; i += 1) {
    await page.getByRole("button", { name: "Activo", exact: true }).click();
  }
  for (const [index, asset] of assets.entries()) {
    const n = index + 1;
    await page.getByLabel(`Nombre del activo ${n}`).fill(asset.name);
    await page.getByLabel(`Valor del activo ${n}`).fill(asset.value ?? "1000");
    await page.getByLabel(`Peso del activo ${n}`).fill(asset.weight);
  }
}

export async function fillVariables(
  page: Page,
  variables: { name: string; impact?: "alto" | "medio" | "bajo" }[] = [
    { name: "Tipo de cambio", impact: "alto" },
    { name: "Tasa de interés", impact: "bajo" },
  ],
): Promise<void> {
  for (let i = 1; i < variables.length; i += 1) {
    await page.getByRole("button", { name: "Variable", exact: true }).click();
  }
  for (const [index, variable] of variables.entries()) {
    const n = index + 1;
    await page.getByLabel(`Nombre de la variable ${n}`).fill(variable.name);
    if (variable.impact && variable.impact !== "medio") {
      await page.getByRole("combobox", { name: `Impacto de la variable ${n}` }).click();
      await page.getByRole("option", { name: variable.impact, exact: true }).click();
    }
  }
}

export async function setProbability(page: Page, index: number, percent: number): Promise<void> {
  const slider = page.getByRole("slider", { name: `Probabilidad de la variable ${index}` });
  await slider.focus();
  await slider.press("Home");
  const pages = Math.floor(percent / 10);
  const steps = percent % 10;
  for (let i = 0; i < pages; i += 1) await slider.press("PageUp");
  for (let i = 0; i < steps; i += 1) await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", String(percent));
}
