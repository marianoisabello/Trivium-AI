import { describe, expect, it } from "vitest";
import { firebaseAuthErrorMessage } from "@/lib/firebase/authErrors";

describe("firebaseAuthErrorMessage", () => {
  it("explica invalid-credential en español y menciona migración", () => {
    const message = firebaseAuthErrorMessage({ code: "auth/invalid-credential" });
    expect(message).toMatch(/Email o contraseña incorrectos/i);
    expect(message).toMatch(/Crear cuenta/i);
  });

  it("mapea email-already-in-use", () => {
    expect(firebaseAuthErrorMessage({ code: "auth/email-already-in-use" })).toMatch(
      /Ya existe una cuenta/i,
    );
  });

  it("usa el mensaje del Error si no hay código conocido", () => {
    expect(firebaseAuthErrorMessage(new Error("falló algo"))).toBe("falló algo");
  });

  it("tiene fallback genérico", () => {
    expect(firebaseAuthErrorMessage(null)).toMatch(/error de autenticación/i);
  });
});
