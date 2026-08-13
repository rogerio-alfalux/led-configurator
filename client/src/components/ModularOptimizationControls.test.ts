import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ModularOptimizationControls } from "./ModularOptimizationControls";

describe("ModularOptimizationControls", () => {
  it("renderiza toggle e lógica padrão por comprimento", () => {
    const html = renderToStaticMarkup(createElement(ModularOptimizationControls, { optimizeModuleCount: false, allowLongModules: false, allowFractional: false, allowMixedIF: false, onOptimizeModuleCountChange: () => undefined }));
    expect(html).toContain("Otimizar Quantidade de Módulos");
    expect(html).toContain("Lógica ativa:");
    expect(html).toContain("Otimizar pelo comprimento mais próximo");
  });

  it("renderiza as preferências combinadas ativas", () => {
    const html = renderToStaticMarkup(createElement(ModularOptimizationControls, { optimizeModuleCount: true, allowLongModules: true, allowFractional: true, allowMixedIF: true, onOptimizeModuleCountChange: () => undefined }));
    expect(html).toContain("Otimizar quantidade de módulos");
    expect(html).toContain("módulos longos permitidos");
    expect(html).toContain("medidas quebradas");
    expect(html).toContain("IFs diferentes");
  });
});
