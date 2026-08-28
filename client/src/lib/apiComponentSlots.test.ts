import { describe, expect, it } from "vitest";
import {
  formatApiComponentSlot,
  getApiModuleComponentSlots,
  replaceApiModuleComponentSlot,
} from "./apiComponentSlots";

describe("apiComponentSlots", () => {
  const options = [
    { codigo: "EQ00147", descricao: "MÓDULO LED MODULO LINEAR 6 LEDS", tipo: "MODULO_LED", disponivel: true },
    { codigo: "CP00121", descricao: "LENTE OTICA 6 PONTOS 48º", tipo: "OTICA", disponivel: true },
    { codigo: "CP00185", descricao: "MASCARA PARA LENTE", tipo: "HOLDER", disponivel: true },
    { codigo: "CP00999", descricao: "DISSIPADOR ALUMINIO", tipo: "DISSIPADOR", disponivel: true },
  ];

  it("separa somente os componentes oficiais devolvidos pela API", () => {
    const slots = getApiModuleComponentSlots({
      moduloLedCode: "EQ00147",
      moduloLed: "MÓDULO LED MODULO LINEAR 6 LEDS (P0000786) (EQ00147) + LENTE OTICA 6 PONTOS 48º (CP00121) + MASCARA PARA LENTE (CP00185) + DISSIPADOR ALUMINIO (CP00999)",
    }, options);

    expect(slots.map(slot => [slot.label, slot.code])).toEqual([
      ["Módulo LED", "EQ00147"],
      ["Óptica", "CP00121"],
      ["Holder", "CP00185"],
      ["Dissipador", "CP00999"],
    ]);
    expect(formatApiComponentSlot(slots[0])).toBe("MODULO LINEAR 6 LEDS (EQ00147)");
  });

  it("preserva os demais componentes ao editar somente uma ótica", () => {
    const original = "MODULO LINEAR 6 LEDS (EQ00147) + LENTE OTICA 6 PONTOS 48º (CP00121) + MASCARA PARA LENTE (CP00185)";
    const slots = getApiModuleComponentSlots({ moduloLed: original, moduloLedCode: "EQ00147" }, options);
    const updated = replaceApiModuleComponentSlot(original, slots[1], "LENTE OTICA 6 PONTOS 36º", "CP00777", 2);

    expect(updated).toBe("MODULO LINEAR 6 LEDS (EQ00147) + 2x LENTE OTICA 6 PONTOS 36º (CP00777) + MASCARA PARA LENTE (CP00185)");
  });

  it("exibe o módulo LED técnico de item legado mesmo sem código EQ persistido", () => {
    const description = "STRIPFLEX 562.5 X 10MM - 36 LEDS 840 - 4000K (LC) 25V";
    const slots = getApiModuleComponentSlots({
      moduloLed: `1.6X ${description}`,
      moduloLedCode: null,
    }, []);

    expect(slots).toEqual([expect.objectContaining({
      label: "Módulo LED",
      kind: "MODULO_LED",
      description,
      code: "",
      qty: 1.6,
    })]);
    expect(formatApiComponentSlot(slots[0])).toBe(description);
  });
});
