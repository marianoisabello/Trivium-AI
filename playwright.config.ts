import { defineConfig, devices } from "@playwright/test";

const localEnv = {
  DATABASE_URL:
    process.env["DATABASE_URL"] ??
    "postgresql://trivium:trivium@localhost:5433/trivium?schema=public",
  FIREBASE_PROJECT_ID: process.env["FIREBASE_PROJECT_ID"] ?? "demo-trivium",
  FIREBASE_AUTH_EMULATOR_HOST: process.env["FIREBASE_AUTH_EMULATOR_HOST"] ?? "127.0.0.1:9099",
  VITE_FIREBASE_PROJECT_ID: process.env["VITE_FIREBASE_PROJECT_ID"] ?? "demo-trivium",
  VITE_FIREBASE_API_KEY: process.env["VITE_FIREBASE_API_KEY"] ?? "demo-api-key",
  VITE_FIREBASE_AUTH_DOMAIN:
    process.env["VITE_FIREBASE_AUTH_DOMAIN"] ?? "demo-trivium.firebaseapp.com",
  VITE_FIREBASE_USE_EMULATOR: process.env["VITE_FIREBASE_USE_EMULATOR"] ?? "true",
  AI_PROVIDER: process.env["AI_PROVIDER"] ?? "mock",
  AI_RATE_LIMIT_PER_HOUR: process.env["AI_RATE_LIMIT_PER_HOUR"] ?? "30",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    locale: "es-AR",
  },
  webServer: {
    command: "bun run dev -- --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      ...localEnv,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
