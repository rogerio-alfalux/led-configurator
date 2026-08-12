import { describe, expect, it } from "vitest";
import { roleGrantsAllPermissions } from "./permissionsService";

describe("roleGrantsAllPermissions", () => {
  it("concede a administradores as funções de amostra e manutenção", () => {
    expect(roleGrantsAllPermissions("admin")).toBe(true);
  });

  it("mantém funções não administrativas dependentes das permissões individuais", () => {
    expect(roleGrantsAllPermissions("assistant")).toBe(false);
    expect(roleGrantsAllPermissions("user")).toBe(false);
    expect(roleGrantsAllPermissions(null)).toBe(false);
  });
});

