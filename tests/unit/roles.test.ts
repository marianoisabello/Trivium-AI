import { describe, expect, it } from "vitest";
import { isSuperadminAuthorized, pickEffectiveRole, SELF_ASSIGNABLE_ROLES } from "@/lib/auth/roles";

describe("isSuperadminAuthorized", () => {
  it("exige claim superadmin Y fila de rol en la base", () => {
    expect(isSuperadminAuthorized("superadmin", true)).toBe(true);
  });

  it("claim superadmin sin fila en la base (rol revocado) no pasa", () => {
    expect(isSuperadminAuthorized("superadmin", false)).toBe(false);
  });

  it("fila en la base sin claim superadmin no pasa", () => {
    expect(isSuperadminAuthorized("admin", true)).toBe(false);
    expect(isSuperadminAuthorized("cliente", true)).toBe(false);
    expect(isSuperadminAuthorized(undefined, true)).toBe(false);
  });

  it("ningún otro claim pasa, ni parecido", () => {
    for (const claim of ["Superadmin", "SUPERADMIN", "super_admin", "superadmin ", "", "root"]) {
      expect(isSuperadminAuthorized(claim, true)).toBe(false);
    }
  });
});

describe("pickEffectiveRole", () => {
  it("superadmin gana sobre admin y cliente", () => {
    expect(pickEffectiveRole(["cliente", "admin", "superadmin"])).toBe("superadmin");
    expect(pickEffectiveRole(["admin", "superadmin"])).toBe("superadmin");
  });

  it("admin gana sobre cliente, sin importar el orden", () => {
    expect(pickEffectiveRole(["cliente", "admin"])).toBe("admin");
    expect(pickEffectiveRole(["admin", "cliente"])).toBe("admin");
  });

  it("sin roles cae a admin (igual que antes)", () => {
    expect(pickEffectiveRole([])).toBe("admin");
  });
});

describe("roles que el usuario puede elegir al registrarse", () => {
  it("NO incluye superadmin", () => {
    expect(SELF_ASSIGNABLE_ROLES).not.toContain("superadmin");
    expect([...SELF_ASSIGNABLE_ROLES].sort()).toEqual(["admin", "cliente"]);
  });
});
