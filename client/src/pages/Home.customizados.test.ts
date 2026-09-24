import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const homeSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");

describe("Customizados na Home", () => {
  it("coleta cor, cliente específico e observações sem perder a seleção de produto", () => {
    expect(homeSource).toContain('const [czColor, setCzColor] = useState<string>("")');
    expect(homeSource).toContain('const [czClient, setCzClient] = useState<string>("")');
    expect(homeSource).toContain("Cor da peça");
    expect(homeSource).toContain("Cliente específico");
    expect(homeSource).toContain("Observações");
  });

  it("persiste cor e identificação de cliente nos campos comerciais já propagados", () => {
    expect(homeSource).toContain("corPeca: czColor.trim()");
    expect(homeSource).toContain("Cliente específico: ${czClient.trim()}");
    expect(homeSource).toContain("itemNote:");
    expect(homeSource).toContain('category: "Customizados"');
  });

  it("oferece inclusão de acessórios nos painéis de Revenda, Customizados e Item Especial", () => {
    expect(homeSource).toContain('productCategory === "Revenda"');
    expect(homeSource).toContain('productCategory === "Customizados"');
    expect(homeSource).toContain('productCategory === "Item Especial"');
    expect(homeSource.match(/Incluir Acessório/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });

  it("anexa acessórios pendentes ao item antes de enviar para carrinho ou orçamento", () => {
    expect(homeSource).toContain("const itemWithPendingAccessories = pendingAccessories.length > 0");
    expect(homeSource).toContain("setPendingAccessories([])");
    expect(homeSource).toContain("dispatchItemDirect(itemWithPendingAccessories, \"A Definir\")");
  });

  it("mantém quantidade, Item em Planta e acessórios também no fluxo de Item Especial", () => {
    expect(homeSource).toContain('const [spQty, setSpQty] = useState<string>("1")');
    expect(homeSource).toContain('const [spItemEmPlanta, setSpItemEmPlanta] = useState<string>("")');
    expect(homeSource).toContain('itemEmPlanta: spItemEmPlanta.trim() || undefined');
    expect(homeSource).toContain('qty: effectiveQty');
    expect(homeSource).toContain("const finalItemWithAcc: CartItemData = pendingAccessories.length > 0");
    expect(homeSource).toContain("handleAddItemOrToQuote(finalItemWithAcc)");
    expect(homeSource).toContain("addItem(finalItemWithAcc)");
  });
});
