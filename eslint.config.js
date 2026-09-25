import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // src/integrations/supabase/**: generado por Lovable Cloud / Supabase CLI,
  // se pisa en cada sync — no lintear ni formatear.
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      "src/integrations/supabase/**",
      "playwright-report",
      "test-results",
      "blob-report",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Regla de la migración a Cloud SQL: todo acceso a la DB pasa por un
  // repository (src/repositories/**) -- nunca @prisma/client directo desde
  // server functions, rutas o componentes.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["src/repositories/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@prisma/client",
              message:
                "No importes @prisma/client fuera de src/repositories/ — todo acceso a la base pasa por un repository (ver Sección 3 de la migración a Cloud SQL).",
            },
          ],
        },
      ],
    },
  },
  eslintPluginPrettier,
);
