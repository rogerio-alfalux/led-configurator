import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("controles de otimização modular na Home", () => {
  it("posiciona a preferência por quantidade antes de módulos longos e exibe a lógica ativa", () => {
    const longToggle = homeSource.indexOf('id="longmodules"');
    const controls = homeSource.indexOf("ModularOptimizationControls");
    expect(controls).toBeGreaterThan(-1);
    expect(longToggle).toBeGreaterThan(controls);
  });

  it("inclui a preferência por quantidade no input de cálculo de perfis", () => {
    expect(homeSource).toContain("optimizeModuleCount,");
  });
});
