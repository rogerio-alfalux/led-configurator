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
});
