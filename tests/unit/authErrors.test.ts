import { describe, expect, it } from "vitest";
import { firebaseAuthErrorMessage } from "@/lib/firebase/authErrors";

describe("firebaseAuthErrorMessage", () => {
  it("explica invalid-credential", () => {
    const message = firebaseAuthErrorMessage({ code: "auth/invalid-credential" });
    expect(message).toMatch(/Email o contraseña incorrectos/i);
  });

  it("usa el mensaje del Error si no hay código conocido", () => {
    expect(firebaseAuthErrorMessage(new Error("falló algo"))).toBe("falló algo");
  });
});
