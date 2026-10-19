import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard estático: el repository cross-organización (platform.ts) es la única
 * excepción a "todo filtra por organizationId", así que solo puede usarse
 * desde las server functions de plataforma, y todas esas deben pasar por
 * requireSuperadmin. Si alguien rompe esto, este test falla.
 */
const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f));
const rel = (f: string) => relative(SRC, f).replaceAll("\\", "/");

describe("aislamiento del repository de plataforma", () => {
  it("solo platformService.functions.ts importa valores de @/repositories/platform", () => {
    const offenders = files
      .filter((f) => rel(f) !== "repositories/platform.ts")
      .filter((f) => {
        const text = readFileSync(f, "utf8");
        // `import type {...}` se borra en el build y no ejecuta código del repository.
        return /import\s+(?!type\b)[^;]*from\s+["']@\/repositories\/platform["']/.test(text);
      })
      .map(rel);

    expect(offenders).toEqual(["services/platformService.functions.ts"]);
  });

  it("toda server function de plataforma usa requireSuperadmin", () => {
    const text = readFileSync(join(SRC, "services/platformService.functions.ts"), "utf8");
    const definitions = text.split("createServerFn(").slice(1);

    expect(definitions.length).toBeGreaterThan(0);
    for (const def of definitions) {
      expect(def.split(".handler(")[0]).toContain("requireSuperadmin");
    }
  });

  it("ninguna server function de plataforma escribe datos (solo lectura)", () => {
    const repo = readFileSync(join(SRC, "repositories/platform.ts"), "utf8");
    expect(repo).not.toMatch(/\.(create|update|upsert|delete|deleteMany|updateMany)\(/);
  });

  it("requireSuperadmin solo se importa desde las funciones de plataforma", () => {
    // Busca imports reales, no menciones en comentarios.
    const importsIt = /import\s+[^;]*\brequireSuperadmin\b[^;]*from/;
    const users = files
      .filter((f) => rel(f) !== "lib/auth/verifyToken.ts")
      .filter((f) => importsIt.test(readFileSync(f, "utf8")))
      .map(rel);
    expect(users).toEqual(["services/platformService.functions.ts"]);
  });
});
