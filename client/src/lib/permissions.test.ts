import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, PERMISSIONS } from "@shared/permissions";

describe("catálogo de permissões granulares", () => {
  it("expõe todas as permissões funcionais críticas sem duplicidade", () => {
    const keys = ALL_PERMISSIONS.map((item) => item.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain(PERMISSIONS.EDITAR_PRECOS);
    expect(keys).toContain(PERMISSIONS.EDITAR_PRECOS_DRIVER);
    expect(keys).toContain(PERMISSIONS.VER_CUSTOS);
    expect(keys).toContain(PERMISSIONS.EDITAR_DESCONTOS);
    expect(keys).toContain(PERMISSIONS.EDITAR_COMISSAO);
    expect(keys).toContain(PERMISSIONS.VER_DASHBOARD);
    expect(keys).toContain(PERMISSIONS.EDITAR_METAS);
    expect(keys).toContain(PERMISSIONS.GERENCIAR_ORCAMENTOS);
  });

  it("mantém rótulos e descrições para todos os checkboxes do painel administrativo", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(permission.label.trim()).not.toBe("");
      expect(permission.description.trim()).not.toBe("");
    }
  });
});
