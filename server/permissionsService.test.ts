import { describe, expect, it } from "vitest";
import { roleGrantsAllPermissions } from "./permissionsService";
import { ALL_PERMISSIONS, PERMISSIONS } from "../shared/permissions";

describe("roleGrantsAllPermissions", () => {
  it("concede a administradores as funções de amostra e manutenção", () => {
    expect(roleGrantsAllPermissions("admin")).toBe(true);
  });

  it("mantém funções não administrativas dependentes das permissões individuais", () => {
    expect(roleGrantsAllPermissions("assistant")).toBe(false);
    expect(roleGrantsAllPermissions("user")).toBe(false);
    expect(roleGrantsAllPermissions(null)).toBe(false);
  });

  it("expõe a permissão granular de marcação manual de duplicidade", () => {
    expect(ALL_PERMISSIONS.map((permission) => permission.key)).toContain(PERMISSIONS.MARCAR_DUPLICADOS_MANUALMENTE);
  });
});
