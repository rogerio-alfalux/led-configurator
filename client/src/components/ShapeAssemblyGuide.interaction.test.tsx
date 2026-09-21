/** @vitest-environment jsdom */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

  it("chama a impressão nativa diretamente ao clicar em Imprimir guia", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<ShapeAssemblyGuide result={result} />);

    fireEvent.click(screen.getByRole("button", { name: "Guia de Montagem" }));
    expect(screen.getByText("Guia de montagem — BLAZE H")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Imprimir guia" }));
    expect(print).toHaveBeenCalledOnce();
    expect(screen.getByText("Guia de montagem — BLAZE H")).toBeTruthy();
    print.mockRestore();
  });
});
