import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("quantidade de drivers LED BAR e famílias FL", () => {
  it("usa a quantidade oficial total resolvida por corte no resumo técnico", () => {
    expect(homeSource).toContain("{lbResult.driverQtyPerUnit}x {t0.driver.model}");
    expect(homeSource).toContain("Driver {lbDetail.driverFromApi ? '' : `${lbDetail.wattsDriver}W `}× {lbDetail.totalDriverQty}");
  });

  it("persiste a quantidade oficial por corte multiplicada pela quantidade de luminárias", () => {
    expect(homeSource).toContain("driverQty: driverQtyPerUnit * globalQty");
    expect(homeSource).toContain("driverTotalPrice: Math.round(lbDetail.precoDriverPorCorte * driverQtyPerUnit * globalQty * 100) / 100");
    expect(homeSource).toContain("driverQtyPerUnit,");
  });

  it("deixa de usar o número de cortes como quantidade fixa de drivers", () => {
    expect(homeSource).not.toContain("driverQty: r.nCortes,");
  });

  it("mostra e persiste a quantidade de drivers da API no fluxo BAGEO fixo", () => {
    expect(homeSource).toContain("Drivers (API)");
    expect(homeSource).toContain("driverQtyFor(bfResult.product, bfResult.controle, bfResult.tensao)");
    expect(homeSource).toContain("driverLines: bfDrvLines.driverLines");
    expect(homeSource).toContain("driverQtyPerUnit: bfDrvLines.drvQtyPerUnit");
  });
});
