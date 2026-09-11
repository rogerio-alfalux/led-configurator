import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("editor de preço manual do orçamento", () => {
  it("permite preencher itens sem preço da API e mantém o bloqueio apenas para preço oficial sem permissão", () => {
    const source = readFileSync(resolve(process.cwd(), "client/src/pages/QuoteDetail.tsx"), "utf8");

    expect(source).toContain('value={getEditableBodyUnitPrice(d) ?? ""}');
    expect(source).toContain('onUpdate(item.id, { unitPrice: newUnitPrice });');
    expect(source).toContain('readOnly={!!d.priceFromApi && !canOverrideApiPrice}');
    expect(source).toContain('placeholder={d.priceFromApi ? (canOverrideApiPrice ? "Sobrescrever preço da API" : "Preço da API") : "Definir preço"}');
  });
});
