import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard: toda pantalla autenticada tiene que ofrecer el menú de usuario (datos
 * y cerrar sesión), ya sea vía AppLayout o con UserMenu directo. Evita que una
 * pantalla nueva deje al usuario atrapado en una sesión que no puede cerrar.
 */
const DIR = join(process.cwd(), "src/routes/_authenticated");
const pages = readdirSync(DIR).filter((f) => f.endsWith(".tsx") && f !== "route.tsx");

describe("menú de usuario en pantallas autenticadas", () => {
  it("hay pantallas que revisar", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(pages)("%s usa AppLayout o UserMenu", (file) => {
    const text = readFileSync(join(DIR, file), "utf8");
    expect(/<AppLayout\b|<UserMenu\b/.test(text)).toBe(true);
  });

  it("el layout autenticado tiene pantalla de error con menú de usuario", () => {
    const text = readFileSync(join(DIR, "route.tsx"), "utf8");
    expect(text).toContain("errorComponent");
    expect(text).toMatch(/<UserMenu\b/);
  });
});
