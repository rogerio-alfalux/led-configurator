import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("prévia de impressão do guia de montagem", () => {
  const source = readFileSync(
    resolve(process.cwd(), "client/src/components/ShapeAssemblyGuide.tsx"),
    "utf8"
  );

  it("mantém uma única barra de ações acima da folha A4", () => {
    expect(source).toContain("showCloseButton={!printOpen}");
    expect(source).toContain(
      'data-print-control className="flex items-center justify-end gap-2'
    );
    expect(source).toContain(
      'className="bg-muted/30 p-3 sm:p-5"'
    );
    expect(source).toContain(
      'className="inline-assembly-print mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white shadow-sm"'
    );
    expect(source).toContain('<ArrowLeft className="h-4 w-4" /> Voltar');
    expect(source).toContain('<Printer className="h-4 w-4" /> Imprimir guia');
    expect(source).not.toContain("Confira a folha antes de imprimir.");
  });

  it("abre a prévia internamente e imprime somente o HTML da folha", () => {
    expect(source).toContain("onClick={() => setPrintOpen(true)}");
    expect(source).toContain('host.setAttribute("data-print-modal", "true")');
    expect(source).toContain(
      'data-print-content data-inline-print-content class="inline-assembly-print">${guideHtml}'
    );
    expect(source).toContain(
      "window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()))"
    );
  });

  it("preserva descrição, dimensões, item em planta e número do item no guia", () => {
    expect(source).toContain(
      'const guideProductLabel = `${productDescription} — ${dimensionsLabel}${itemMeta ? ` — ${itemMeta}` : ""}`'
    );
    expect(source).toContain("printItem.description = guideProductLabel");
    expect(source).toContain(
      'printItem.itemEmPlanta = result.itemEmPlanta?.trim() || "Guia de montagem"'
    );
  });
});
