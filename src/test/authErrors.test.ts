import { describe, expect, it } from "vitest";
import { getAuthErrorMessage, translateAuthError } from "@/lib/auth-errors";

describe("auth error translations", () => {
  it("translates repeated password errors", () => {
    expect(translateAuthError("New password should be different from the old password."))
      .toBe("La nueva contrasena debe ser diferente a la anterior.");
  });

  it("translates common login errors", () => {
    expect(getAuthErrorMessage(new Error("Invalid login credentials")))
      .toBe("Correo o contrasena incorrectos. Verifica tus datos.");
  });
});
