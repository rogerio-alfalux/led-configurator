import { describe, expect, it } from "vitest";
import {
  isEmailAccessRevoked,
  isEmailAllowed,
  isExceptionAssistantEmail,
} from "./db";

describe("política de acesso de colaboradores desligados", () => {
  it("bloqueia Leandro em todos os caminhos de autenticação", () => {
    const email = "orcamentos.qualy@outlook.com";

    expect(isEmailAccessRevoked(email)).toBe(true);
    expect(isEmailAllowed(email)).toBe(false);
    expect(isExceptionAssistantEmail(email)).toBe(false);
  });
});
