/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShapeAssemblyGuide } from "./ShapeAssemblyGuide";

describe("ShapeAssemblyGuide", () => {
  const result = {
    shape: "RECTANGLE" as const,
    profileName: "BLAZE H",
    profileCode: "LLP-6060",
    assemblyEdges: [{
      id: "superior",
      label: "Superior",
      requestedLength: 4600,
      achievedLength: 4590,
      modules: [
        { type: "CORNER" as const, sku: "LLP-6060.1L1.48F", length: 600, bars: 2 },
        { type: "ML" as const, sku: "LLP-6060.3ML.48F", length: 1695, bars: 3 },
      ],
    }],
  };

  it("abre a prévia de impressão dentro do mesmo diálogo, preservando a configuração", () => {
    render(<ShapeAssemblyGuide result={result} />);

    fireEvent.click(screen.getByRole("button", { name: "Guia de Montagem" }));
    expect(screen.getByText("Guia de montagem — BLAZE H")).toBeTruthy();

    const printButton = screen.getByRole("button", { name: "Abrir guia de montagem para impressão" });
    expect(printButton.className).toContain("min-w-52");
    fireEvent.click(printButton);
    expect(screen.getByText("Prévia de impressão")).toBeTruthy();
    expect(screen.getByText("Voltar")).toBeTruthy();
    expect(screen.getByText("INSTRUÇÃO DE MONTAGEM")).toBeTruthy();
  });
});
