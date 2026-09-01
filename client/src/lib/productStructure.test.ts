import { describe, expect, it } from "vitest";
import { adaptProductStructure, aggregateProductStructureComponents, formatProductStructureSummaryLines, withProductLightingCcts } from "./productStructure";

describe("productStructure", () => {
  it("preserva outro equipamento do SHIFT com código MP e quantidade da API", () => {
    const structure = adaptProductStructure({
      modoIluminacao: "SEM_MODULO_LED",
      semModuloLed: true,
      outrosEquipamentos: [{
        componentId: 4980001,
        modelo: "PCI CONTATO 500MM REV01 (500X26MM)",
        codigo: "MP00064",
        tipo: "MODULO_LED",
        qtd: 2,
      }],
    });

    expect(structure.lightingMode).toBe("NO_LED_MODULE");
    expect(structure.lightSource).toBeNull();
    expect(structure.otherEquipments).toEqual([{
      componentId: 4980001,
      description: "PCI CONTATO 500MM REV01 (500X26MM)",
      code: "MP00064",
      type: "MODULO_LED",
      quantity: 2,
    }]);
    expect(withProductLightingCcts(["2700K"], structure)).toEqual([]);
  });

  it("trata Tunable White como CCT único e preserva seu módulo", () => {
    const structure = adaptProductStructure({
      moduloTunableWhite: true,
      moduloLedTunableWhite: "MÓDULO LED TW 20W",
      moduloLedTunableWhiteCode: "EQ00999",
      qtdModuloLedTunableWhite: 3,
    });

    expect(structure.lightingMode).toBe("TUNABLE_WHITE");
    expect(structure.lightSource).toMatchObject({
      description: "MÓDULO LED TW 20W",
      code: "EQ00999",
      quantity: 3,
    });
    expect(withProductLightingCcts(["2700K", "4000K"], structure)).toEqual(["TUNABLE WHITE"]);
  });

  it("preserva a lâmpada estruturada como fonte de luz", () => {
    const structure = adaptProductStructure({
      modoIluminacao: "LAMPADA",
      moduloLampada: true,
      lampadaAcessorioId: 123,
      lampada: {
        descricao: "LÂMPADA LED G9 5W 2700K",
        codigo: "CP00991",
        quantidade: 2,
      },
    });

    expect(structure.lightingMode).toBe("LAMP");
    expect(structure.lightSource).toEqual({
      componentId: 123,
      description: "LÂMPADA LED G9 5W 2700K",
      code: "CP00991",
      type: "LAMPADA",
      quantity: 2,
    });
    expect(withProductLightingCcts(["2700K"], structure)).toEqual([]);
  });

  it("não inventa uma lâmpada quando a API publica apenas a flag", () => {
    const structure = adaptProductStructure({ moduloLampada: true, lampada: null });
    expect(structure.lightingMode).toBe("LAMP");
    expect(structure.lightSource).toBeNull();
  });

  it("soma a quantidade por módulo sem perder o código oficial do componente", () => {
    const component = {
      componentId: 4980001,
      description: "PCI CONTATO 500MM REV01 (500X26MM)",
      code: "MP00064",
      type: "MODULO_LED",
      quantity: 2,
    };

    expect(aggregateProductStructureComponents([
      { component, multiplier: 3 },
      { component, multiplier: 4 },
    ])).toEqual([{ ...component, quantity: 14 }]);
  });

  it("formata lâmpada e outros equipamentos para o orçamento", () => {
    expect(formatProductStructureSummaryLines({
      productLightingMode: "LAMP",
      productLightSource: {
        description: "LÂMPADA LED G9 5W 2700K",
        code: "CP00991",
        type: "LAMPADA",
        quantity: 2,
      },
      apiOtherEquipments: [{
        description: "PCI CONTATO 500MM REV01 (500X26MM)",
        code: "MP00064",
        type: "MODULO_LED",
        quantity: 1,
      }],
    })).toEqual([
      "LÂMPADA: 2x LÂMPADA LED G9 5W 2700K (CP00991)",
      "EQUIPAMENTO: 1x PCI CONTATO 500MM REV01 (500X26MM) (MP00064)",
    ]);
  });
});
